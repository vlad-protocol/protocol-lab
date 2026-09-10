import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ProtocolListShell } from "./protocol-list-shell";

export const dynamic = "force-dynamic";

export default async function ProtocolListPage() {
  await requireAccess("protocol_list");

  const members = await prisma.protocolListMember.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Users className="h-6 w-6 text-[var(--hq-accent)]" />
          Protocol List
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          The free-workout and event crowd — completely separate from the Protocol CRM's
          sponsors, venues, and clients. Add people one at a time or paste in a batch; a signup
          form can feed this same list automatically later.
        </p>
      </div>

      <div className="mt-6">
        <ProtocolListShell
          initialMembers={members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
