import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ContactHeader } from "./contact-header";
import { Timeline } from "./timeline";
import { LeadSummaryPanel } from "./lead-summary-panel";
import { SequencePanel } from "./sequence-panel";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAccess("people");
  const { id } = await params;

  const [contact, reps, sequences, enrollments] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        assignedRep: { select: { id: true, name: true, email: true } },
        interactions: {
          orderBy: { occurredAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { createdAt: "asc" } }),
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

  if (!contact) notFound();

  const latestEmail = contact.interactions.find((i) => i.type === "EMAIL");
  const hasEmailHistory = Boolean(latestEmail);
  const stale = Boolean(
    contact.summaryGeneratedAt && latestEmail && latestEmail.occurredAt > contact.summaryGeneratedAt
  );

  return (
    <div className="max-w-4xl">
      <Link
        href="/dashboard/people"
        className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All people
      </Link>

      <ContactHeader contact={contact} reps={reps} canDelete={session.user.role === "OWNER"} />

      <LeadSummaryPanel
        contactId={contact.id}
        summary={contact.lastConversationSummary}
        nextStep={contact.suggestedNextStep}
        nextFollowUpDate={contact.nextFollowUpDate ? contact.nextFollowUpDate.toISOString() : null}
        generatedAt={contact.summaryGeneratedAt ? contact.summaryGeneratedAt.toISOString() : null}
        stale={stale}
        hasEmailHistory={hasEmailHistory}
      />

      <SequencePanel
        contactId={contact.id}
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
        contactId={contact.id}
        interactions={contact.interactions.map((i) => ({ ...i, occurredAt: i.occurredAt.toISOString() }))}
        contactEmail={contact.email}
        contactPhone={contact.phone}
      />
    </div>
  );
}
