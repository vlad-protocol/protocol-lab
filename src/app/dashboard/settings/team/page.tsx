import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TeamClient } from "./team-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <ShieldCheck className="h-6 w-6 text-[var(--hq-accent)]" />
        Team &amp; permissions
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Invite teammates and control exactly which tabs each of them can see. You (the
        owner) always have full access; this only restricts everyone else.
      </p>

      <TeamClient
        currentUserId={session.user.id}
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      />
    </div>
  );
}
