import { prisma } from "@/lib/prisma";
import { sendGmail } from "@/lib/integrations/gmail";
import { daysToMs, fillTemplate, stepTemplateFor } from "@/lib/sequences";
import { researchStepPersonalization } from "@/lib/sequence-research";

// The confirmation-gated counterpart to runDueSequenceSteps (see
// sequences.ts) — for any ACTIVE enrollment on a requiresConfirmation
// sequence whose nextSendAt has passed, this researches this step's
// personalization (if it has a researchAngle), merges everything into a
// ready-to-send subject/body, and files it as a SequenceStepDraft
// instead of sending it. The enrollment moves to AWAITING_CONFIRMATION
// so the send tick leaves it alone until a person acts on the draft via
// the Automation Confirmations page.
export async function runDueSequenceDraftGeneration(baseUrl: string) {
  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextSendAt: { lte: new Date() }, sequence: { requiresConfirmation: true } },
    include: {
      contact: true,
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });

  const results: { contactName: string; stepOrder: number; drafted?: boolean; error?: string }[] = [];

  for (const enrollment of due) {
    const stepOrder = enrollment.currentStep;
    try {
      if (!enrollment.sequence.enabled) continue;

      const step = enrollment.sequence.steps[stepOrder];
      if (!step) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", nextSendAt: null },
        });
        continue;
      }
      if (!enrollment.contact.email) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "CANCELED", nextSendAt: null },
        });
        results.push({ contactName: enrollment.contact.contactName, stepOrder, error: "no email on file" });
        continue;
      }

      // A tick can fire more than once before the enrollment status
      // update below is visible everywhere — this guards against ever
      // drafting the same (enrollment, step) twice.
      const alreadyDrafted = await prisma.sequenceStepDraft.findUnique({
        where: { enrollmentId_stepOrder: { enrollmentId: enrollment.id, stepOrder } },
      });
      if (alreadyDrafted) continue;

      const repUser = enrollment.sequence.createdById
        ? await prisma.user.findUnique({ where: { id: enrollment.sequence.createdById } })
        : null;

      let observation = "";
      let hook = "";
      let researchNotes: string | null = null;

      if (step.researchAngle) {
        const brand = enrollment.contact.companyName || enrollment.contact.contactName;
        const result = await researchStepPersonalization({
          brand,
          angle: step.researchAngle,
          language: enrollment.contact.language,
          context: {
            website: enrollment.contact.website,
            industry: enrollment.contact.industry,
            eventOpportunity: enrollment.contact.eventOpportunity,
            notes: enrollment.contact.notes,
          },
        });
        observation = result.observation;
        hook = result.hook || result.observation.slice(0, 60);
        researchNotes = result.note
          ? `Live research wasn't available (${result.note}) — please write this step's observation yourself before confirming.`
          : !result.observation
            ? "Web search ran but didn't turn up anything solid and verifiable — please fill in the observation yourself before confirming."
            : `${result.researchedLive ? "Researched live via web search" : "Drafted from CRM notes only, no live search"} — confidence: ${result.confidence}.${
                result.sources.length ? ` Sources: ${result.sources.join(", ")}` : ""
              }`;
      }

      const vars = { observation, hook, bookingLink: `${baseUrl}/book` };
      const template = stepTemplateFor(step, enrollment.contact.language);
      const subject = fillTemplate(template.subject, enrollment.contact, repUser?.name || "", vars);
      const body = fillTemplate(template.body, enrollment.contact, repUser?.name || "", vars);

      await prisma.sequenceStepDraft.create({
        data: { enrollmentId: enrollment.id, stepOrder, subject, body, researchNotes },
      });

      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "AWAITING_CONFIRMATION" },
      });

      results.push({ contactName: enrollment.contact.contactName, stepOrder, drafted: true });
    } catch (err) {
      results.push({ contactName: enrollment.contact.contactName, stepOrder, error: err instanceof Error ? err.message : "failed" });
    }
  }

  return results;
}

// Sends a confirmed draft as-is (whatever subject/body it currently
// holds — the caller should have already saved any edits), logs it as a
// normal outbound Interaction, and advances the enrollment to its next
// step (or COMPLETED) exactly like a non-gated sequence send does.
export async function sendConfirmedDraft(draftId: string, confirmedById: string) {
  const draft = await prisma.sequenceStepDraft.findUnique({
    where: { id: draftId },
    include: {
      enrollment: {
        include: { contact: true, sequence: { include: { steps: { orderBy: { order: "asc" } } } } },
      },
    },
  });
  if (!draft) throw new Error("Draft not found.");
  if (draft.status !== "PENDING") throw new Error("This draft has already been handled.");

  const { enrollment } = draft;
  if (!enrollment.contact.email) throw new Error("This lead has no email on file.");
  if (!enrollment.sequence.createdById) throw new Error("This sequence has no owner.");

  const gmailConn = await prisma.gmailConnection.findUnique({ where: { userId: enrollment.sequence.createdById } });
  if (!gmailConn) throw new Error("The sequence owner's Gmail isn't connected.");

  const externalId = await sendGmail(enrollment.sequence.createdById, enrollment.contact.email, draft.subject, draft.body);

  await prisma.interaction.create({
    data: {
      contactId: enrollment.contactId,
      userId: enrollment.sequence.createdById,
      type: "EMAIL",
      direction: "OUTBOUND",
      subject: draft.subject,
      body: draft.body,
      toAddress: enrollment.contact.email,
      externalId,
      sequenceEnrollmentId: enrollment.id,
      sequenceStepOrder: draft.stepOrder,
    },
  });

  const nextIndex = draft.stepOrder + 1;
  const nextStep = enrollment.sequence.steps[nextIndex];
  await prisma.$transaction([
    prisma.sequenceStepDraft.update({
      where: { id: draft.id },
      data: { status: "SENT", sentAt: new Date(), confirmedAt: new Date(), confirmedById },
    }),
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: nextIndex,
        lastSentAt: new Date(),
        nextSendAt: nextStep ? new Date(Date.now() + daysToMs(nextStep.delayDays)) : null,
        status: nextStep ? "ACTIVE" : "COMPLETED",
      },
    }),
  ]);
}

// Rejects a pending draft without sending it. "skip" moves the
// enrollment on to its next step on the normal schedule (as if this
// touch simply didn't happen); "cancel" stops the whole enrollment for
// this lead.
export async function rejectDraft(draftId: string, action: "skip" | "cancel") {
  const draft = await prisma.sequenceStepDraft.findUnique({
    where: { id: draftId },
    include: { enrollment: { include: { sequence: { include: { steps: { orderBy: { order: "asc" } } } } } } },
  });
  if (!draft) throw new Error("Draft not found.");
  if (draft.status !== "PENDING") throw new Error("This draft has already been handled.");

  const { enrollment } = draft;

  await prisma.$transaction([
    prisma.sequenceStepDraft.update({ where: { id: draft.id }, data: { status: "REJECTED" } }),
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data:
        action === "cancel"
          ? { status: "CANCELED", nextSendAt: null }
          : (() => {
              const nextIndex = draft.stepOrder + 1;
              const nextStep = enrollment.sequence.steps[nextIndex];
              return {
                currentStep: nextIndex,
                nextSendAt: nextStep ? new Date(Date.now() + daysToMs(nextStep.delayDays)) : null,
                status: nextStep ? "ACTIVE" : "COMPLETED",
              };
            })(),
    }),
  ]);
}
