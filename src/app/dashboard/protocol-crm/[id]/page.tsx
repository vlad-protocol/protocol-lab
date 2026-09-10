import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { LeadHeader } from "./lead-header";
import { LeadDetails } from "./lead-details";
import { LeadSummaryPanel } from "./lead-summary-panel";
import { SequencePanel } from "./sequence-panel";
import { Timeline } from "./timeline";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAccess("protocol_crm");
  const { id } = await params;

  const [lead, sequences, enrollments] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        interactions: {
          orderBy: { occurredAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.emailSequence.findMany({
      where: { enabled: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sequenceEnrollment.findMany({
      where: { contactId: id },
      orderBy: { enrolledAt: "desc" },
      include: { sequence: { select: { id: true, name: true, steps: { select: { id: true } } } } },
    }),
  ]);

  if (!lead) notFound();

  const latestEmail = lead.interactions.find((i) => i.type === "EMAIL");
  const hasEmailHistory = Boolean(latestEmail);
  const stale = Boolean(
    lead.summaryGeneratedAt && latestEmail && latestEmail.occurredAt > lead.summaryGeneratedAt
  );

  return (
    <div className="max-w-4xl">
      <Link
        href="/dashboard/protocol-crm"
        className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </Link>

      <LeadHeader lead={lead} canDelete={session.user.role === "OWNER"} />

      <LeadDetails
        details={{
          id: lead.id,
          industry: lead.industry,
          website: lead.website,
          source: lead.source,
          followUpOwner: lead.followUpOwner,
          dateFirstContacted: lead.dateFirstContacted ? lead.dateFirstContacted.toISOString() : null,
          lastContactDate: lead.lastContactDate ? lead.lastContactDate.toISOString() : null,
          totalTouches: lead.totalTouches,
          eventOpportunity: lead.eventOpportunity,
          dealValue: lead.dealValue,
          notes: lead.notes,
        }}
      />

      <LeadSummaryPanel
        contactId={lead.id}
        summary={lead.lastConversationSummary}
        nextStep={lead.nextStep}
        nextFollowUpDate={lead.nextFollowUpDate ? lead.nextFollowUpDate.toISOString() : null}
        generatedAt={lead.summaryGeneratedAt ? lead.summaryGeneratedAt.toISOString() : null}
        stale={stale}
        hasEmailHistory={hasEmailHistory}
      />

      <SequencePanel
        contactId={lead.id}
        sequences={sequences}
        enrollments={enrollments.map((e) => ({
          id: e.id,
          status: e.status,
          currentStep: e.currentStep,
          nextSendAt: e.nextSendAt ? e.nextSendAt.toISOString() : null,
          lastSentAt: e.lastSentAt ? e.lastSentAt.toISOString() : null,
          sequence: {
            id: e.sequence.id,
            name: e.sequence.name,
            stepCount: e.sequence.steps.length,
          },
        }))}
      />

      <Timeline
        contactId={lead.id}
        interactions={lead.interactions.map((i) => ({ ...i, occurredAt: i.occurredAt.toISOString() }))}
        contactEmail={lead.email}
        contactPhone={lead.phone}
      />
    </div>
  );
}
