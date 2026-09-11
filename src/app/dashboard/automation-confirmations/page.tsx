import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { AutomationConfirmationsShell } from "./automation-confirmations-shell";

export const dynamic = "force-dynamic";

export default async function AutomationConfirmationsPage() {
  await requireAccess("sequences");

  const drafts = await prisma.sequenceStepDraft.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, number: true, contactName: true, companyName: true, email: true } },
          sequence: { select: { id: true, name: true, steps: { select: { id: true }, orderBy: { order: "asc" } } } },
        },
      },
    },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <ClipboardCheck className="h-6 w-6 text-[var(--hq-accent)]" />
        Automation Confirmations
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Every draft below was generated automatically by a cold-outreach sequence — including its
        personalized observation, researched live from the web where possible. Nothing here has
        been sent yet. Read the research note, fix anything that's off (or missing), and confirm
        to send — or skip this one lead, or cancel the sequence for them entirely.
      </p>

      <AutomationConfirmationsShell
        initialDrafts={drafts.map((d) => ({
          id: d.id,
          subject: d.subject,
          body: d.body,
          researchNotes: d.researchNotes,
          createdAt: d.createdAt.toISOString(),
          stepOrder: d.stepOrder,
          stepCount: d.enrollment.sequence.steps.length,
          sequenceName: d.enrollment.sequence.name,
          contact: d.enrollment.contact,
        }))}
      />
    </div>
  );
}
