import { Presentation } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { LiveProposalList } from "./list-view";

export const dynamic = "force-dynamic";

export default async function LiveProposalPage() {
  await requireAccess("live_proposal");
  const [proposals, contacts] = await Promise.all([
    prisma.liveProposal.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { contact: { select: { companyName: true, contactName: true } } },
    }),
    prisma.contact.findMany({ select: { id: true, companyName: true, contactName: true }, orderBy: { updatedAt: "desc" }, take: 500 }),
  ]);
  return (
    <div className="max-w-5xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <Presentation className="h-6 w-6 text-[var(--hq-accent)]" />
        Live Proposal
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Build the proposal deck during the discovery call. Start one before the call, share the
        Google Meet tab with audio, and the transcript fills the discovery fields and drafts concepts
        as you talk. Present the deck at the end and close on the call.
      </p>
      <div className="mt-6">
        <LiveProposalList
          proposals={proposals.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            acceptedAt: p.acceptedAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
            lead: p.contact ? p.contact.companyName || p.contact.contactName : null,
          }))}
          contacts={contacts.map((c) => ({ id: c.id, label: c.companyName ? `${c.companyName} (${c.contactName})` : c.contactName }))}
        />
      </div>
    </div>
  );
}
