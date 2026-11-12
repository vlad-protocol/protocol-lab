import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveProposalSession } from "@/lib/live-proposal-auth";
import { deckNumbers, val, type Fields, type LiveConcept, type PriceTier } from "@/lib/live-proposal";
import { ACTIVATION_TIMELINE_TEMPLATE, computeStepDates } from "@/lib/activation-timeline";
import { seedContentAssets } from "@/lib/activation-content-assets";

// The "Yes" on the deck's last slide. Records the payment choice and, when
// the proposal is tied to a CRM lead, turns it into a real deal: the lead
// goes to WON, an Activation is created (timeline seeded, rules 1-4 filled
// from the concept, quote and payment milestones set), and a note lands
// on the lead's timeline. The agreement + deposit invoice are still sent
// by a person from the Activation page; nothing is emailed from here.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { paymentChoice?: string };
  const paymentChoice = body.paymentChoice === "SPLIT_20_40_40" ? "SPLIT_20_40_40" : "PAY_IN_FULL";

  const p = await prisma.liveProposal.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = p.fields as Fields;
  const n = deckNumbers(fields, p.priceTier as PriceTier);
  const concepts = (p.concepts as LiveConcept[]) || [];
  const concept = concepts[p.chosenConcept ?? 0];
  let activationId = p.activationId;

  if (p.contactId && !activationId) {
    const existing = await prisma.activation.findUnique({ where: { contactId: p.contactId } });
    if (existing) {
      activationId = existing.id;
    } else {
      const contact = await prisma.contact.findUnique({ where: { id: p.contactId } });
      const dates = computeStepDates(null);
      const preTax = paymentChoice === "PAY_IN_FULL" ? n.tier.payInFull : n.tier.price;
      const total = paymentChoice === "PAY_IN_FULL" ? n.pif : n.total;
      const activation = await prisma.activation.create({
        data: {
          contactId: p.contactId,
          eventName: concept?.name || `${val(fields, "studioName", "Studio")} Takeover`,
          mainSponsorCategory: contact?.industry || null,
          contentAssets: seedContentAssets() as object,
          createdById: session!.user.id,
          rule1Goal: `${n.passTarget} tonight-only offers sold with code PROTOCOL (target, not a guarantee); ${n.members30} new members by day 30.`,
          rule2Connection: concept?.connection || null,
          rule3Currency: "Email + SMS opt-in at RSVP, a story tag",
          rule4Story: concept?.story || null,
          attendanceTarget: n.headcount,
          offerCode: "PROTOCOL",
          quotePreTax: preTax,
          quoteTax: total - preTax,
          quoteTotal: total,
          steps: {
            create: ACTIVATION_TIMELINE_TEMPLATE.map((s) => ({
              stepNumber: s.stepNumber, phase: s.phase, title: s.title, owner: s.owner, doneWhen: s.doneWhen,
              dueDate: dates.get(s.stepNumber) || null,
            })),
          },
          payments: {
            create: paymentChoice === "PAY_IN_FULL"
              ? [{ label: "Paid in full at signing", amount: Math.round(total * 100) / 100 }]
              : [
                  { label: "Deposit (20%)", amount: Math.round(total * 0.2 * 100) / 100 },
                  { label: "Second payment (40%, T-7 days)", amount: Math.round(total * 0.4 * 100) / 100 },
                  { label: "Final payment (40%)", amount: Math.round(total * 0.4 * 100) / 100 },
                ],
          },
        },
      });
      activationId = activation.id;
    }
    await prisma.contact.update({ where: { id: p.contactId }, data: { status: "WON", dealValue: n.tier.price } });
    await prisma.interaction.create({
      data: {
        contactId: p.contactId,
        userId: session!.user.id,
        type: "NOTE",
        direction: "OUTBOUND",
        subject: "Proposal accepted on the call",
        body: `Accepted "${concept?.name || p.title}" (${n.tier.label}), ${paymentChoice === "PAY_IN_FULL" ? "pay in full" : "20/40/40"}. Send the agreement and invoice from the Activation page.`,
      },
    });
  }

  const updated = await prisma.liveProposal.update({
    where: { id },
    data: { acceptedAt: new Date(), paymentChoice, activationId, status: "DONE" },
  });
  return NextResponse.json({ proposal: updated, activationId });
}
