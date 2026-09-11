import { prisma } from "@/lib/prisma";
import { sendGmail } from "@/lib/integrations/gmail";

function firstNameOf(contactName: string): string {
  return contactName.trim().split(/\s+/)[0] || contactName;
}

// extra covers the cold-outreach-only tokens: {{observation}} and
// {{hook}} (AI-researched personalization, see sequence-drafts.ts) and
// {{bookingLink}}. Plain sequences that never set requiresConfirmation
// simply never reference those tokens, so passing {} for extra is a
// no-op for them.
export function fillTemplate(
  text: string,
  contact: { contactName: string; companyName: string | null },
  repName: string,
  extra: { observation?: string; hook?: string; bookingLink?: string } = {}
) {
  const brand = contact.companyName || contact.contactName;
  return text
    .replaceAll("{{contactName}}", contact.contactName)
    .replaceAll("{{firstName}}", firstNameOf(contact.contactName))
    .replaceAll("{{companyName}}", contact.companyName || "")
    .replaceAll("{{brand}}", brand)
    .replaceAll("{{repName}}", repName)
    .replaceAll("{{observation}}", extra.observation || "")
    .replaceAll("{{hook}}", extra.hook || "")
    .replaceAll("{{bookingLink}}", extra.bookingLink || "");
}

export function daysToMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

// Picks which language variant of a step's subject/body to actually use,
// based on the contact's Preferred language (see Contact.language). Falls
// back to the English subject/body whenever a French version hasn't been
// filled in for that step, so a partially-translated sequence never sends
// something blank.
export function stepTemplateFor(
  step: { subject: string; body: string; subjectFr?: string | null; bodyFr?: string | null },
  contactLanguage: "EN" | "FR"
) {
  if (contactLanguage === "FR" && step.subjectFr && step.bodyFr) {
    return { subject: step.subjectFr, body: step.bodyFr };
  }
  return { subject: step.subject, body: step.body };
}

// Shared template for the 3-touch cold-outreach sequence — hook, value-add,
// breakup — for Protocol sponsorship leads. Used both to seed a brand-new
// account (getOrSeedDefaultSequence, below) and by the one-time admin
// migration (/api/admin/migrate-sponsor-sequence) that upgrades an account
// whose default sequence was already seeded under the old name/content
// before these templates existed. Keep both call sites reading from here so
// they can never drift apart.
export const DEFAULT_SEQUENCE_TEMPLATE = {
  name: "Sponsor Cold Outreach",
  description:
    "3-touch cold email sequence for Protocol sponsorship leads: hook, value-add, breakup. Every step's personalized observation is researched and drafted automatically, then waits for your confirmation in Automation Confirmations before it sends. Each contact's Preferred language (English/French, set on their lead page) picks which version actually sends.",
  steps: [
    {
      order: 0,
      delayDays: 0,
      researchAngle:
        "A specific, personalized hook — one real, current, checkable reason Protocol (a Montreal sober rave built around a group workout: real sweat first, then a DJ set) and this brand's audience overlap right now. E.g. a recent launch, event, sponsorship, or audience move.",
      subject: "{{hook}} + Protocol x {{brand}}",
      body: `Hi {{firstName}},

{{observation}}

Quick intro: we run Protocol, a Montreal fitness and nightlife brand. Our flagship event, AFTR:HOURS, pairs a real workout with a DJ set afterward, alcohol-free. We've sold out all three AFTR:HOURS events to date, drawn 500+ attendees at each of our free run/bike nights, and built an engaged audience of 6,000 on Instagram plus 700+ on our email/SMS list.

{{brand}} would be in front of exactly that audience — people who train hard and go out hard, in the same night.

Sponsorship runs from $500 to $2,500+ and can include on-site sampling or activation, a feed or story post to our audience, and placement in our email/SMS send. I can send over the full one-pager if useful.

Would a quick call this week make sense, or would it be easier if I just sent the numbers first?

Best,
{{repName}}
Protocol | hello@protocolevent.com | @byprotocol | protocolevent.com`,
      subjectFr: "{{hook}} + Protocol x {{brand}}",
      bodyFr: `Bonjour {{firstName}},

{{observation}}

En bref : nous dirigeons Protocol, une marque montréalaise à la croisée du fitness et de la vie nocturne. Notre événement phare, AFTR:HOURS, combine un vrai entraînement suivi d'un DJ, sans alcool. Nos trois éditions d'AFTR:HOURS ont toutes affiché complet, nos soirées course/vélo gratuites ont attiré plus de 500 personnes à chaque fois, et nous avons bâti une communauté engagée de 6 000 abonnés sur Instagram ainsi que plus de 700 contacts sur notre liste courriel/SMS.

{{brand}} se retrouverait exactement devant ce public — des gens qui s'entraînent fort et qui sortent fort, la même soirée.

Les commandites vont de 500 $ à 2 500 $ et plus, et peuvent inclure une activation ou distribution d'échantillons sur place, une publication ou story sur notre compte, ainsi qu'une présence dans notre envoi courriel/SMS. Je peux vous faire parvenir la fiche complète si utile.

Est-ce qu'un court appel cette semaine vous conviendrait, ou préférez-vous que je vous envoie d'abord les chiffres ?

Cordialement,
{{repName}}
Protocol | hello@protocolevent.com | @byprotocol | protocolevent.com`,
    },
    {
      order: 1,
      delayDays: 2,
      researchAngle:
        "One genuinely useful, specific observation about this brand or the audience they reach — not a pitch, something with real insight, e.g. about what's working for them right now or a trend touching their audience.",
      subject: "Re: Protocol x {{brand}}",
      body: `Hi {{firstName}},

Following up in case this got buried.

One thing worth sharing regardless of whether we end up working together: {{observation}}

If it would help to compare notes on reaching this audience, I'm happy to hop on a short call, no pitch involved. If a call isn't necessary, I can also just send our numbers over for you to review on your own time — {{bookingLink}}.

Best,
{{repName}}`,
      subjectFr: "Re : Protocol x {{brand}}",
      bodyFr: `Bonjour {{firstName}},

Je fais un suivi au cas où ce message se serait perdu.

Une chose que je tenais à partager, peu importe la suite : {{observation}}

Si ça peut être utile de comparer nos notes sur la façon de rejoindre ce public, je serais content d'en discuter rapidement par appel, sans pitch. Si un appel n'est pas nécessaire, je peux aussi simplement vous envoyer nos chiffres à consulter à votre rythme — {{bookingLink}}.

Cordialement,
{{repName}}`,
    },
    {
      order: 2,
      delayDays: 4,
      researchAngle: null as string | null,
      subject: "Should I close the loop?",
      body: `Hi {{firstName}},

Haven't heard back, so I'm guessing the timing isn't right, and that's completely fine.

We're finalizing sponsors for our next event this week, so I'll assume it's a pass for now unless I hear otherwise.

If reaching a fitness-and-nightlife audience in Montreal becomes a priority down the line, I'm around. Rooting for {{brand}} either way.

Best,
{{repName}}
Protocol`,
      subjectFr: "Dois-je fermer la boucle ?",
      bodyFr: `Bonjour {{firstName}},

Je n'ai pas eu de nouvelles, alors je présume que le moment n'est pas idéal, et c'est tout à fait correct.

Nous finalisons nos commandites pour le prochain événement cette semaine, donc je vais considérer que c'est un non pour l'instant, sauf avis contraire de votre part.

Si rejoindre un public fitness et vie nocturne à Montréal devient une priorité plus tard, je reste disponible. Bonne continuité à {{brand}}.

Cordialement,
{{repName}}
Protocol`,
    },
  ],
};

// Default 3-touch cold-outreach sequence for Protocol sponsorship leads —
// hook, value-add, breakup — created once, automatically, the first time
// anyone opens the Sequences page on an account with none yet. Fully
// editable afterward; nothing here auto-enrolls anyone, so seeding it has
// no effect until a lead is actually enrolled.
//
// requiresConfirmation is on: the first two steps lean on a specific,
// researched observation about the brand (see researchAngle below and
// src/lib/sequence-research.ts), so every step's draft — personalization
// included — waits in Automation Confirmations for a human to check
// before it actually sends, rather than going out untouched.
export async function getOrSeedDefaultSequence(userId: string) {
  const existing = await prisma.emailSequence.findFirst();
  if (existing) return;

  await prisma.emailSequence.create({
    data: {
      name: DEFAULT_SEQUENCE_TEMPLATE.name,
      description: DEFAULT_SEQUENCE_TEMPLATE.description,
      enabled: true,
      requiresConfirmation: true,
      createdById: userId,
      steps: { create: DEFAULT_SEQUENCE_TEMPLATE.steps },
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
//
// Excludes any sequence with requiresConfirmation on — those go through
// runDueSequenceDraftGeneration (src/lib/sequence-drafts.ts) instead,
// which drafts a personalized step for manual review rather than sending
// straight away.
export async function runDueSequenceSteps() {
  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextSendAt: { lte: new Date() }, sequence: { requiresConfirmation: false } },
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

      const template = stepTemplateFor(step, enrollment.contact.language);
      const subject = fillTemplate(template.subject, enrollment.contact, repUser?.name || "");
      const body = fillTemplate(template.body, enrollment.contact, repUser?.name || "");
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
