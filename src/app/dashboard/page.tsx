import Link from "next/link";
import { Flame, BarChart2, Users, Workflow } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user.id;

  const [reelCount, statCount, contactCount, automationCount] = await Promise.all([
    prisma.reel.count({ where: { userId } }),
    prisma.weeklyStat.count({ where: { userId } }),
    canAccess(session.user, "people") ? prisma.contact.count() : Promise.resolve(0),
    canAccess(session.user, "automations") ? prisma.automation.count() : Promise.resolve(0),
  ]);

  const tiles = [
    canAccess(session.user, "content") && {
      href: "/dashboard/content",
      icon: <Flame className="h-3.5 w-3.5 text-orange-500" />,
      label: "Trial reels",
      value: reelCount,
      sub: "logged",
    },
    canAccess(session.user, "analytics") && {
      href: "/dashboard/analytics",
      icon: <BarChart2 className="h-3.5 w-3.5 text-[var(--hq-accent)]" />,
      label: "Analytics",
      value: statCount,
      sub: "weekly snapshots",
    },
    canAccess(session.user, "people") && {
      href: "/dashboard/people",
      icon: <Users className="h-3.5 w-3.5 text-[var(--hq-accent)]" />,
      label: "People",
      value: contactCount,
      sub: "contacts tracked",
    },
    canAccess(session.user, "automations") && {
      href: "/dashboard/automations",
      icon: <Workflow className="h-3.5 w-3.5 text-[var(--hq-accent)]" />,
      label: "Automations",
      value: automationCount,
      sub: "configured",
    },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string; value: number; sub: string }[];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-[var(--hq-text)]">
        Welcome{session.user.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        {session.user.role === "OWNER"
          ? "You have full access to everything. Manage what your team can see under Settings → Team."
          : "Here's what you have access to — ask the owner if you need more."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-xl border border-[var(--hq-card-border)] bg-white p-5 hover:border-[var(--hq-accent)]"
          >
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">
              {t.icon} {t.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--hq-text)]">{t.value}</p>
            <p className="text-sm text-[var(--hq-text-muted)]">{t.sub}</p>
          </Link>
        ))}
        {tiles.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            You don't have access to any modules yet — ask the owner to grant some under
            Settings → Team.
          </p>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-[var(--hq-card-border)] p-5">
        <p className="text-sm font-medium text-[var(--hq-text)]">Coming in later phases</p>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Recordings, meeting copilot, content queue/editor, calendar, booking, docs, and
          e-signatures — greyed out in the sidebar with a phase number, built one at a
          time.
        </p>
      </div>
    </div>
  );
}
