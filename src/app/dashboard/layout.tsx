import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-[var(--hq-canvas)]">
      <Sidebar
        userLabel={session.user?.name || "My HQ"}
        handle={session.user?.email || ""}
        followerLabel={total > 0 ? `${formatFollowers(total)} followers tracked` : null}
        role={session.user.role}
        permissions={session.user.permissions}
        signOutAction={signOutAction}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
