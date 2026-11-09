import { prisma } from "@/lib/prisma";
import { getTwilioConfig } from "@/lib/integrations/twilio";
import { isCallTranscriptionConfigured, transcribeCallRecording } from "@/lib/integrations/assemblyai";

// Mirrors transcribePendingPosts() in lib/content-performance.ts — same
// PENDING -> PROCESSING -> DONE/FAILED lifecycle, just for recorded phone
// calls instead of Instagram Reels. The recording-status Twilio webhook
// sets transcriptStatus to PENDING as soon as a call's recordingUrl lands;
// this drains that queue. See instrumentation.ts for the tick that calls
// it, and the speaker-diarization logic in integrations/assemblyai.ts.
export async function transcribePendingCallRecordings(batchSize = 3) {
  if (!isCallTranscriptionConfigured()) return [];

  const twilioConfig = await getTwilioConfig();
  if (!twilioConfig) return []; // no Twilio recording could exist without it connected

  const pending = await prisma.interaction.findMany({
    where: { transcriptStatus: "PENDING" },
    take: batchSize,
    orderBy: { occurredAt: "asc" },
  });

  const results: { id: string; error?: string }[] = [];
  for (const interaction of pending) {
    await prisma.interaction.update({ where: { id: interaction.id }, data: { transcriptStatus: "PROCESSING" } });
    try {
      if (!interaction.recordingUrl) throw new Error("No recording URL on this interaction.");
      const transcript = await transcribeCallRecording(interaction.recordingUrl, twilioConfig);
      await prisma.interaction.update({
        where: { id: interaction.id },
        data: { transcript, transcriptStatus: "DONE", transcriptError: null },
      });
      results.push({ id: interaction.id });
    } catch (err) {
      const error = err instanceof Error ? err.message : "transcription failed";
      await prisma.interaction.update({
        where: { id: interaction.id },
        data: { transcriptStatus: "FAILED", transcriptError: error },
      });
      results.push({ id: interaction.id, error });
    }
  }
  return results;
}
