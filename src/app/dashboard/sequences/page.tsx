import { Repeat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { getOrSeedDefaultSequence, DEFAULT_SEQUENCE_TEMPLATE } from "@/lib/sequences";
import { SequencesClient } from "./sequences-client";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const session = await requireAccess("sequences");

  // First-ever visit on an account with none yet gets a starter 3-step
  // sequence seeded automatically — see getOrSeedDefaultSequence for why.
  await getOrSeedDefaultSequence(session.user.id);

  // Accounts whose default sequence predates the current templates don't
  // get refreshed by the seed above (it only fires on a completely empty
  // table) — surface a sync button instead. See
  // /api/admin/migrate-sponsor-sequence. Two tells that it's stale: it's
  // still under the old name, or it's under the current name but a step
  // is missing its French version (every step in the current template has
  // one, so a missing bodyFr means this predates that update).
  const oldNamed = await prisma.emailSequence.findFirst({ where: { name: "New Lead Follow-Up" }, select: { id: true } });
  const currentNamed = await prisma.emailSequence.findFirst({
    where: { name: DEFAULT_SEQUENCE_TEMPLATE.name },
    select: { steps: { select: { bodyFr: true } } },
  });
  const hasOldDefaultSequence = !!oldNamed || !!currentNamed?.steps.some((s) => !s.bodyFr);

  const sequences = await prisma.emailSequence.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      steps: { orderBy: { order: "asc" } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <Repeat className="h-6 w-6 text-[var(--hq-accent)]" />
        Follow-up Sequences
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Automated multi-step email sequences for leads. Nothing here enrolls anyone
        automatically — enroll a lead from their contact page, and each step sends on
        its own schedule from whoever created the sequence's connected Gmail. A reply
        from the lead automatically pauses their enrollment. Use {"{{contactName}}"},{" "}
        {"{{firstName}}"}, {"{{companyName}}"}, {"{{brand}}"}, {"{{repName}}"},{" "}
        {"{{bookingLink}}"}, and {"{{observation}}"}/{"{{hook}}"} (only if this sequence
        requires confirmation — see below) in the subject or body to personalize. Each
        step can also have a French version — whichever a contact's Preferred language
        (set on their lead page) picks, falling back to English if no French version is
        filled in. A
        sequence with "Require confirmation" on never sends a step on its own: each due
        step researches its observation (if it has one), drafts the merged email, and
        waits for you to review and confirm it on the{" "}
        <a href="/dashboard/automation-confirmations" className="text-[var(--hq-accent)] hover:underline">
          Automation Confirmations
        </a>{" "}
        page.
      </p>

      <SequencesClient
        hasOldDefaultSequence={hasOldDefaultSequence}
        initialSequences={sequences.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          enabled: s.enabled,
          requiresConfirmation: s.requiresConfirmation,
          activeCount: s._count.enrollments,
          createdBy: s.createdBy,
          steps: s.steps.map((st) => ({
            id: st.id,
            delayDays: st.delayDays,
            subject: st.subject,
            body: st.body,
            researchAngle: st.researchAngle,
            subjectFr: st.subjectFr,
            bodyFr: st.bodyFr,
          })),
        }))}
      />
    </div>
  );
}
