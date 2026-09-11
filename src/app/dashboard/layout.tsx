import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { OPEN_STATUSES } from "./protocol-crm/types";
import { Sidebar } from "./sidebar";

export const dynamic = "force-dynamic";

function formatFollowers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const stats = await prisma.weeklyStat.findMany({
    where: { userId },
    orderBy: { weekOf: "desc" },
  });
  const latestByPlatform = new Map<string, number>();
  for (const s of stats) {
    if (!latestByPlatform.has(s.platform)) latestByPlatform.set(s.platform, s.followerCount);
  }
  const total = [...latestByPlatform.values()].reduce((a, b) => a + b, 0);

  // Red sidebar badges — how many things on each of these pages actually
  // need YOU to do something manually right now, not just a page visit
  // count. Only computed for modules this user can actually see.
  const badges: Record<string, number> = {};

  if (canAccess(session.user, "sequences")) {
    badges["/dashboard/automation-confirmations"] = await prisma.sequenceStepDraft.count({
      where: { status: "PENDING" },
    });
  }

  if (canAccess(session.user, "protocol_crm")) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    badges["/dashboard/protocol-crm"] = await prisma.contact.count({
      where: {
        status: { in: OPEN_STATUSES },
        OR: [
          { priority: "HOT", status: "NEW_LEAD" },
          { nextFollowUpDate: { lte: endOfToday } },
        ],
      },
    });
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-[var(--hq-canvas)]">
      <Sidebar
        userLabel={session.user?.name || "Owner"}
        handle={session.user?.email || ""}
        followerLabel={total > 0 ? `${formatFollowers(total)} followers tracked` : null}
        role={session.user.role}
        permissions={session.user.permissions}
        badges={badges}
        signOutAction={signOutAction}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
