import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isTouchInteraction, recomputeContactTouches } from "@/lib/crm-touch";

// Deletes one logged Communication Log entry — for the "I made a
// mistake" case (logged the wrong call, fat-fingered a note, duplicate
// entry from a sync, etc). This only removes HQ's own record of the
// interaction; it doesn't unsend an email or delete a Twilio recording.
// If the deleted row counted as a touch, the lead's touch bookkeeping
// (totalTouches/lastContactDate/dateFirstContacted) is recomputed from
// whatever's left, since we can't just decrement without knowing if this
// was the row that set those fields.
const VALID_OUTCOMES = new Set(["NO_ANSWER", "VOICEMAIL", "CONNECTED_NOT_BOOKED", "DEMO_BOOKED", "RESCHEDULED"]);

// Tags (or clears) a call's outcome for the Sales dashboard — used both
// right after manually logging a call and, for a Twilio-bridged or
// live-recorded call whose outcome wasn't known at log time, from a quick
// control on the Communication Log entry itself.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, interactionId } = await params;
  const body = await req.json().catch(() => ({}));
  const { callOutcome } = body as { callOutcome?: string | null };

  if (callOutcome !== null && callOutcome !== undefined && !VALID_OUTCOMES.has(callOutcome)) {
    return NextResponse.json({ error: "Invalid call outcome." }, { status: 400 });
  }

  const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
  if (!interaction || interaction.contactId !== id) {
    return NextResponse.json({ error: "Interaction not found." }, { status: 404 });
  }
  if (interaction.type !== "CALL") {
    return NextResponse.json({ error: "Only calls can have an outcome." }, { status: 400 });
  }

  const updated = await prisma.interaction.update({
    where: { id: interactionId },
    data: { callOutcome: (callOutcome as never) ?? null },
  });

  return NextResponse.json({ interaction: { ...updated, occurredAt: updated.occurredAt.toISOString() } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, interactionId } = await params;

  const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
  if (!interaction || interaction.contactId !== id) {
    return NextResponse.json({ error: "Interaction not found." }, { status: 404 });
  }

  await prisma.interaction.delete({ where: { id: interactionId } });

  if (isTouchInteraction(interaction.type, interaction.direction)) {
    await recomputeContactTouches(id);
  }

  return NextResponse.json({ ok: true });
}
