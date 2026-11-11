import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getTwilioConfig } from "@/lib/integrations/twilio";
import { transcribeOne } from "@/lib/call-transcription";

// Manual retry for a call/video call whose transcription attempt is
// stuck at FAILED — the background tick (transcribePendingCallRecordings)
// only ever picks up PENDING rows, so a FAILED one otherwise sits there
// forever even after whatever broke it (a bad deploy, a bug) gets fixed.
// Runs synchronously and returns the real error (if any) straight to the
// UI, instead of only writing it silently to transcriptError.
export async function POST(
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
  if (interaction.type !== "CALL" && interaction.type !== "VIDEO_CALL") {
    return NextResponse.json({ error: "Only calls and video calls can be transcribed." }, { status: 400 });
  }
  if (!interaction.recordingUrl) {
    return NextResponse.json({ error: "There's no recording on this entry to transcribe." }, { status: 400 });
  }

  await prisma.interaction.update({
    where: { id: interactionId },
    data: { transcriptStatus: "PROCESSING", transcriptError: null },
  });

  const twilioConfig = await getTwilioConfig();
  const result = await transcribeOne(interaction, twilioConfig);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const updated = await prisma.interaction.findUnique({ where: { id: interactionId } });
  return NextResponse.json({
    transcript: updated?.transcript || null,
    transcriptStatus: updated?.transcriptStatus || null,
  });
}
