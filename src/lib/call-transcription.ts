import { prisma } from "@/lib/prisma";
import { getTwilioConfig } from "@/lib/integrations/twilio";
import { isCallTranscriptionConfigured, transcribeRecording } from "@/lib/integrations/assemblyai";

// Mirrors transcribePendingPosts() in lib/content-performance.ts — same
// PENDING -> PROCESSING -> DONE/FAILED lifecycle. Covers two sources of
// recorded calls, both landing on the same Interaction fields:
//  - CALL: Twilio's recording-status webhook sets transcriptStatus to
//    PENDING as soon as a bridged call's recordingUrl lands. Fetching the
//    recording requires Twilio's own account credentials (Basic auth).
//  - VIDEO_CALL: a Zoom (or other) discovery call logged with a recording
//    link but no pasted transcript (see the Video call form on a lead's
//    timeline) — best-effort auto-transcription, no auth, since most
//    screen/Zoom recording links aren't protected the way Twilio's is. If
//    the link needs a login to view, this will fail and land in FAILED —
//    paste the Zoom-generated transcript directly instead, which skips
//    this pipeline entirely (set straight to DONE on creation).
// See instrumentation.ts for the tick that calls this, and the
// speaker-diarization logic in integrations/assemblyai.ts.
export async function transcribePendingCallRecordings(batchSize = 3) {
  if (!isCallTranscriptionConfigured()) return [];

  const pending = await prisma.interaction.findMany({
    where: { transcriptStatus: "PENDING" },
    take: batchSize,
    orderBy: { occurredAt: "asc" },
  });
  if (pending.length === 0) return [];

  const twilioConfig = await getTwilioConfig();

  const results: { id: string; error?: string }[] = [];
  for (const interaction of pending) {
    await prisma.interaction.update({ where: { id: interaction.id }, data: { transcriptStatus: "PROCESSING" } });
    try {
      if (!interaction.recordingUrl) throw new Error("No recording URL on this interaction.");
      const basicAuth =
        interaction.type === "CALL" && twilioConfig
          ? { username: twilioConfig.accountSid, password: twilioConfig.authToken }
          : undefined;
      if (interaction.type === "CALL" && !basicAuth) {
        throw new Error("Twilio isn't connected, so this call recording can't be fetched.");
      }
      const transcript = await transcribeRecording(interaction.recordingUrl, basicAuth);
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
