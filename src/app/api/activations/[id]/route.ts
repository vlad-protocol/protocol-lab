import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computeStepDates } from "@/lib/activation-timeline";
import { buildPaymentSchedule } from "@/lib/activation-cost-sheet";
import { gate1Passes, gate2Passes } from "@/lib/activation-rules";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const activation = await prisma.activation.findUnique({
    where: { id },
    include: {
      contact: true,
      steps: { orderBy: { stepNumber: "asc" } },
      sponsors: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!activation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ activation });
}

const STRING_FIELDS = [
  "eventName",
  "mainSponsorCategory",
  "rule1Goal",
  "rule2Connection",
  "rule3Currency",
  "rule4Story",
  "rule5StartEarly",
  "rule6GrandEntrance",
  "rule7Journey",
  "rule8PeakMoment",
  "rule9Trigger",
  "rule10CloseLoop",
  "reportNextStep",
  "offerCode",
] as const;
const NUMBER_FIELDS = [
  "clientMultiplier",
  "attendanceTarget",
  "attendanceActual",
  "dayOfConversions",
  "revenueReported",
  "totalImpressions",
  "referralCount",
  "npsScore",
  "rsvpCount",
  "productsTriedCount",
  "optInCount",
  "contentCpm",
] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.activation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (key in body) data[key] = body[key] === "" ? null : (body[key] as string);
  }
  for (const key of NUMBER_FIELDS) {
    if (key in body) {
      const v = body[key];
      data[key] = v === "" || v === null || v === undefined ? null : Number(v);
    }
  }
  if (body.packageTier === "BRONZE" || body.packageTier === "SILVER" || body.packageTier === "GOLD") {
    data.packageTier = body.packageTier;
  }

  if (Array.isArray(body.contentAssets)) {
    data.contentAssets = body.contentAssets as object;
  }

  let eventDateChanged = false;
  if ("eventDate" in body) {
    const v = body.eventDate as string | null;
    data.eventDate = v ? new Date(v) : null;
    eventDateChanged = true;
  }

  // Gate timestamps: stamp the moment all required fields for that gate
  // are present, so "passed" has a real date rather than being recomputed
  // from scratch every time (and clear it if an answer gets blanked out).
  const merged: Record<string, unknown> = { ...existing, ...data };
  data.gate1PassedAt = gate1Passes(merged) ? existing.gate1PassedAt || new Date() : null;
  data.gate2PassedAt = gate2Passes(merged) ? existing.gate2PassedAt || new Date() : null;

  const activation = await prisma.activation.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  // If the event date changed, recompute every step's due date and
  // regenerate any still-PLANNED (not yet invoiced) payment due dates.
  if (eventDateChanged) {
    const dates = computeStepDates(activation.eventDate);
    await prisma.$transaction(
      activation.steps.map((s) =>
        prisma.activationStep.update({ where: { id: s.id }, data: { dueDate: dates.get(s.stepNumber) || null } })
      )
    );
    const payments = await prisma.activationPayment.findMany({ where: { activationId: id, status: "PLANNED" } });
    if (payments.length > 0 && activation.quoteTotal > 0) {
      const schedule = buildPaymentSchedule(activation.quoteTotal, null, activation.eventDate);
      await prisma.$transaction(
        payments.map((p, i) => prisma.activationPayment.update({ where: { id: p.id }, data: { dueDate: schedule[i]?.dueDate || null } }))
      );
    }
  }

  return NextResponse.json({ activation });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.activation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
