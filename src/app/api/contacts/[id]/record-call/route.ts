import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordContactTouch, isTouchInteraction } from "@/lib/crm-touch";

const MAX_BYTES = 150 * 1024 * 1024; // 150MB — generous for even a long call at a modest bitrate
const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
]);

// Saves a call recorded live in the browser — Vlad on a call from his
// own phone's native dialer, on speaker, with this page open and
// recording through the phone's own microphone. Not dialed through
// Twilio at all, so there's no bridging, no rep-phone-rings-first step —
// just "start recording, have the conversation, stop and save."
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const form = await req.formData();
  const file = form.get("audio");
  const direction = (form.get("direction") as string) || "OUTBOUND";
  const durationSeconds = Number(form.get("durationSeconds")) || null;
  const body = (form.get("body") as string) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No recording received." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The recording was empty — try again." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Recording is too large — max ${MAX_BYTES / 1024 / 1024}MB.` }, { status: 400 });
  }
  const contentType = ALLOWED_TYPES.has(file.type) ? file.type : "audio/webm";

  const buffer = Buffer.from(await file.arrayBuffer());

  const recording = await prisma.callRecording.create({
    data: {
      data: buffer,
      contentType,
      size: buffer.length,
      createdById: session.user.id,
    },
  });

  const interaction = await prisma.interaction.create({
    data: {
      contactId: id,
      userId: session.user.id,
      type: "CALL",
      direction: direction as "INBOUND" | "OUTBOUND",
      body,
      durationSeconds,
      recordingUrl: `/api/call-recordings/${recording.id}/audio`,
      transcriptStatus: "PENDING",
      occurredAt: new Date(),
    },
  });

  if (isTouchInteraction(interaction.type, interaction.direction)) {
    await recordContactTouch(id, interaction.occurredAt);
  }

  return NextResponse.json({ interaction: { ...interaction, occurredAt: interaction.occurredAt.toISOString() } });
}
