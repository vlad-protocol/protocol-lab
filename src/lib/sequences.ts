import { prisma } from "@/lib/prisma";
import { sendGmail } from "@/lib/integrations/gmail";

function fillTemplate(
  text: string,
  contact: { contactName: string; companyName: string | null },
  repName: string
) {
  return text
    .replaceAll("{{contactName}}", contact.contactName)
    .replaceAll("{{companyName}}", contact.companyName || "")
    .replaceAll("{{repName}}", repName);
}

export function daysToMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

// Default 3-touch sequence, matching "email 1 when first contacted, email 2
// is a reminder, email 3 is a last check-in before we stop" — created once,
// automatically, the first time anyone opens the Sequences page on an
// account with none yet. Fully editable afterward; nothing here auto-enrolls
// anyone, so seeding it has no effect until a lead is actually enrolled.
export async function getOrSeedDefaultSequence(userId: string) {
  const existing = await prisma.emailSequence.findFirst();
  if (existing) return;

  await prisma.emailSequence.create({
    data: {
      name: "New Lead Follow-Up",
      description: "3-touch sequence for a freshly contacted lead: intro, reminder, final check-in.",
      enabled: true,
      createdById: userId,
      steps: {
        create: [
          {
            order: 0,
            delayDays: 0,
            subject: "Great connecting, {{contactName}}",
            body: `Hi {{contactName}},

Thanks for your interest — wanted to follow up and see if you have any questions I can help with.

Let me know what works best for you.

Best,
{{repName}}`,
          },
          {
            order: 1,
            delayDays: 4,
            subject: "Following up — {{contactName}}",
            body: `Hi {{contactName}},

Just wanted to bump this back up in case it got buried. Happy to answer any questions or set up a quick call whenever works for you.

Best,
{{repName}}`,
          },
          {
            order: 2,
            delayDays: 5,
            subject: "Still interested?",
            body: `Hi {{contactName}},

We've tried reaching out a couple of times now — totally understand if the timing isn't right. Just let me know if you'd like to keep the conversation going, or if we should check back another time.

Best,
{{repName}}`,
          },
        ],
      },
    },
  });
}

// Enrolls a contact starting from the sequence's first step. Doesn't send
// anything itself — the background tick (or "Send now") picks it up once
// nextSendAt has passed. Nothing calls this automatically; enrollment is
// always an explicit action from a contact's page.
export async function enrollContact(contactId: string, sequenceId: string) {
  const sequence = await prisma.emailSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!sequence) throw new Error("Sequence not found.");
  const firstStep = sequence.steps[0];
  if (!firstStep) throw new Error("This sequence has no steps yet — add at least one before enrolling anyone.");

  return prisma.sequenceEnrollment.create({
    data: {
      contactId,
      sequenceId,
      currentStep: 0,
      nextSendAt: new Date(Date.now() + daysToMs(firstStep.delayDays)),
    },
  });
}

// Runs on the same 15-minute tick as Automations (see instrumentation.ts)
// for every ACTIVE enrollment whose nextSendAt has passed: sends the
// current step's email from the sequence owner's connected Gmail, logs it
// as a normal outbound Interaction (so it shows up in the contact's
// conversation same as any other sent email), and advances to the next
// step — or marks the enrollment COMPLETED if that was the last one.
export async function runDueSequenceSteps() {
  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextSendAt: { lte: new Date() } },
    include: {
      contact: true,
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });

  const results: { contactName: string; stepOrder: number; error?: string }[] = [];

  for (const enrollment of due) {
    const stepOrder = enrollment.currentStep;
    try {
      if (!enrollment.sequence.enabled) continue;

      const step = enrollment.sequence.steps[enrollment.currentStep];
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
      if (!enrollment.sequence.createdById) {
        results.push({ contactName: enrollment.contact.contactName, stepOrder, error: "sequence has no owner" });
        continue;
      }

      const [gmailConn, repUser] = await Promise.all([
        prisma.gmailConnection.findUnique({ where: { userId: enrollment.sequence.createdById } }),
        prisma.user.findUnique({ where: { id: enrollment.sequence.createdById } }),
      ]);
      if (!gmailConn) {
        results.push({ contactName: enrollment.contact.contactName, stepOrder, error: "sequence owner's Gmail isn't connected" });
        continue;
      }

      const subject = fillTemplate(step.subject, enrollment.contact, repUser?.name || "");
      const body = fillTemplate(step.body, enrollment.contact, repUser?.name || "");
      const externalId = await sendGmail(enrollment.sequence.createdById, enrollment.contact.email, subject, body);

      await prisma.interaction.create({
        data: {
          contactId: enrollment.contactId,
          userId: enrollment.sequence.createdById,
          type: "EMAIL",
          direction: "OUTBOUND",
          subject,
          body,
          toAddress: enrollment.contact.email,
          externalId,
        },
      });

      const nextIndex = enrollment.currentStep + 1;
      const nextStep = enrollment.sequence.steps[nextIndex];
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextIndex,
          lastSentAt: new Date(),
          nextSendAt: nextStep ? new Date(Date.now() + daysToMs(nextStep.delayDays)) : null,
          status: nextStep ? "ACTIVE" : "COMPLETED",
        },
      });
      results.push({ contactName: enrollment.contact.contactName, stepOrder });
    } catch (err) {
      results.push({ contactName: enrollment.contact.contactName, stepOrder, error: err instanceof Error ? err.message : "failed" });
    }
  }

  return results;
}

// Called whenever a new inbound email gets synced for a contact (see
// /api/mail/inbox) — a real reply should never get buried under the next
// canned follow-up, so every active enrollment for them pauses immediately.
export async function pauseEnrollmentsOnReply(contactId: string) {
  await prisma.sequenceEnrollment.updateMany({
    where: { contactId, status: "ACTIVE" },
    data: { status: "REPLIED", nextSendAt: null },
  });
}
