import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calcActivationTotals, buildPaymentSchedule, type CostLineItem, type PackageTier } from "@/lib/activation-cost-sheet";

// Saves the cost-sheet line items, recomputes totals server-side, and
// (re)generates the 20/40/40 payment schedule — but only replaces
// payments that are still PLANNED, never ones already INVOICED/RECEIVED.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const activation = await prisma.activation.findUnique({ where: { id }, include: { payments: true } });
  if (!activation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { lineItems?: CostLineItem[]; packageTier?: PackageTier; clientMultiplier?: number };
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
  const tier = body.packageTier || activation.packageTier;
  const multiplier = body.clientMultiplier ?? activation.clientMultiplier;

  const totals = calcActivationTotals(lineItems, tier, multiplier);

  const lockedPayments = activation.payments.filter((p) => p.status !== "PLANNED");
  const plannedIds = activation.payments.filter((p) => p.status === "PLANNED").map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    await tx.activation.update({
      where: { id },
      data: { costLineItems: lineItems as object, packageTier: tier, clientMultiplier: multiplier, ...totals },
    });
    if (plannedIds.length > 0) {
      await tx.activationPayment.deleteMany({ where: { id: { in: plannedIds } } });
    }
    // Don't regenerate the schedule if it would double up on milestones
    // already invoiced/received — leave those as the source of truth and
    // only (re)create the still-open ones.
    const alreadyLabeled = new Set(lockedPayments.map((p) => p.label));
    const schedule = buildPaymentSchedule(totals.quoteTotal, null, activation.eventDate).filter((s) => !alreadyLabeled.has(s.label));
    if (schedule.length > 0) {
      await tx.activationPayment.createMany({
        data: schedule.map((s) => ({ activationId: id, label: s.label, amount: s.amount, dueDate: s.dueDate })),
      });
    }
  });

  const updated = await prisma.activation.findUnique({ where: { id }, include: { payments: { orderBy: { dueDate: "asc" } } } });
  return NextResponse.json({ activation: updated });
}
