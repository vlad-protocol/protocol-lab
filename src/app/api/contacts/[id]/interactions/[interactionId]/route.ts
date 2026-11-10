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
const VALID_STAGES = new Set([
  "NO_ANSWER",
  "VOICEMAIL",
  "GATEKEEPER",
  "OWNER_REACHED",
  "PITCHED",
  "CONVERSATION_2MIN",
  "VIDEO_CALL_BOOKED",
]);
const VALID_RESULT_TAGS = new Set(["NONE", "NOT_INTERESTED", "FOLLOW_UP_SET", "WRONG_NUMBER", "DO_NOT_CONTACT"]);

// Tags (or clears) a call's furthest stage reached (and optionally its
// result) for the Sales dashboard — used both right after manually
// logging a call and, for a Twilio-bridged or live-recorded call whose
// outcome wasn't known at log time, from a quick control on the
// Communication Log entry itself.
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
  const { callStageReached, resultTag, objectionHeard, objectionAttempts, lastQuestionAsked } = body as {
    callStageReached?: string | null;
    resultTag?: string;
    objectionHeard?: string | null;
    objectionAttempts?: number;
    lastQuestionAsked?: boolean;
  };

  if (callStageReached !== null && callStageReached !== undefined && !VALID_STAGES.has(callStageReached)) {
    return NextResponse.json({ error: "Invalid call stage." }, { status: 400 });
  }
  if (resultTag !== undefined && !VALID_RESULT_TAGS.has(resultTag)) {
    return NextResponse.json({ error: "Invalid result tag." }, { status: 400 });
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
    data: {
      ...(callStageReached !== undefined ? { callStageReached: (callStageReached as never) ?? null } : {}),
      ...(resultTag !== undefined ? { resultTag: resultTag as never } : {}),
      ...(objectionHeard !== undefined ? { objectionHeard: objectionHeard || null } : {}),
      ...(objectionAttempts !== undefined ? { objectionAttempts } : {}),
      ...(lastQuestionAsked !== undefined ? { lastQuestionAsked } : {}),
    },
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
