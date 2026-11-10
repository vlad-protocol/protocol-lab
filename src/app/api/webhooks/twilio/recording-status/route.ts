import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeInteractionNow } from "@/lib/call-transcription";

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
      data: { recordingUrl: `${recordingUrl}.mp3`, transcriptStatus: "PENDING" },
    });
    // Kick off transcription right away instead of waiting for the next
    // background tick (up to 2 minutes) — see lib/call-transcription.ts.
    // Not awaited: Twilio just wants a fast 200 back for this webhook.
    void transcribeInteractionNow(interaction.id);
  }

  return NextResponse.json({ ok: true });
}
