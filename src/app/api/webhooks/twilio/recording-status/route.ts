import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const form = await req.formData();
  const callSid = form.get("CallSid") as string | null;
  const recordingUrl = form.get("RecordingUrl") as string | null;
  if (!callSid || !recordingUrl) return NextResponse.json({ ok: true });

  const interaction = await prisma.interaction.findFirst({ where: { externalId: callSid } });
  if (interaction) {
    // Twilio's RecordingUrl needs ".mp3" appended to play directly, and
    // fetching it requires your Twilio credentials — see the Comms page.
    await prisma.interaction.update({
      where: { id: interaction.id },
      // transcriptStatus: PENDING kicks off speaker-diarized transcription
      // on the next background tick — see lib/call-transcription.ts.
      data: { recordingUrl: `${recordingUrl}.mp3`, transcriptStatus: "PENDING" },
    });
  }

  return NextResponse.json({ ok: true });
}
