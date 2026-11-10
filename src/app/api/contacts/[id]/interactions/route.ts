import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { recordContactTouch, isTouchInteraction } from "@/lib/crm-touch";

// Manual interaction logging — a call you made from your own phone, a text
// you sent from somewhere else, or a plain note. Emails sent through the
// Mail module and texts sent through Comms log themselves via those
// routes instead; this is the "log it yourself" fallback.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { type, direction, subject, body: text, durationSeconds, recordingUrl, occurredAt, transcript, callOutcome } =
    body as {
      type?: string;
      direction?: string;
      subject?: string;
      body?: string;
      durationSeconds?: number;
      recordingUrl?: string;
      occurredAt?: string;
      transcript?: string;
      callOutcome?: string;
    };

  if (!type || !direction) {
    return NextResponse.json({ error: "type and direction are required." }, { status: 400 });
  }

  // A pasted transcript (e.g. Zoom's own auto-generated transcript on a
  // VIDEO_CALL) is already speaker-labeled and done — nothing to run
  // through the transcription pipeline. A recording link with no pasted
  // transcript queues up for best-effort auto-transcription instead (see
  // lib/call-transcription.ts); CALL interactions get their recording +
  // PENDING status from the Twilio webhook, not here.
  const trimmedTranscript = transcript?.trim() || null;
  const transcriptStatus = trimmedTranscript
    ? "DONE"
    : type === "VIDEO_CALL" && recordingUrl
      ? "PENDING"
      : null;

  const interaction = await prisma.interaction.create({
    data: {
      contactId: id,
      userId: session.user.id,
      type: type as "EMAIL" | "CALL" | "TEXT" | "NOTE" | "VIDEO_CALL",
      direction: direction as "INBOUND" | "OUTBOUND",
      subject: subject || null,
      body: text || null,
      durationSeconds: durationSeconds ?? null,
      recordingUrl: recordingUrl || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      transcript: trimmedTranscript,
      transcriptStatus,
      callOutcome: type === "CALL" && callOutcome ? (callOutcome as never) : null,
    },
  });
  if (isTouchInteraction(interaction.type, interaction.direction)) {
    await recordContactTouch(id, interaction.occurredAt);
  }

  return NextResponse.json({ interaction });
}
