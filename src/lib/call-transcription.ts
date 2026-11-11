import { prisma } from "@/lib/prisma";
import { getTwilioConfig } from "@/lib/integrations/twilio";
import { isCallTranscriptionConfigured, transcribeRecording, transcribeAudioBuffer } from "@/lib/integrations/assemblyai";
import { analyzeInteraction } from "@/lib/sales-coach";

// A recordingUrl in this form points at a locally-stored recording (the
// "Record live call" button on a lead's timeline — see
// api/contacts/[id]/record-call/route.ts) rather than a Twilio or Zoom URL.
// Its bytes live in the CallRecording table, so we read them directly
// instead of fetching over HTTP (the audio route requires session auth that
// this background job doesn't have).
const LOCAL_RECORDING_PREFIX = "/api/call-recordings/";

function localRecordingId(recordingUrl: string): string | null {
  if (!recordingUrl.startsWith(LOCAL_RECORDING_PREFIX)) return null;
  const rest = recordingUrl.slice(LOCAL_RECORDING_PREFIX.length);
  const id = rest.split("/")[0];
  return id || null;
}

type Interaction = Awaited<ReturnType<typeof prisma.interaction.findUniqueOrThrow>>;

export async function transcribeOne(interaction: Interaction, twilioConfig: Awaited<ReturnType<typeof getTwilioConfig>>) {
  try {
    if (!interaction.recordingUrl) throw new Error("No recording URL on this interaction.");
    const localId = localRecordingId(interaction.recordingUrl);
    let transcript: string;
    if (localId) {
      const recording = await prisma.callRecording.findUnique({ where: { id: localId } });
      if (!recording) throw new Error("Recorded audio is missing — it may have been deleted.");
      transcript = await transcribeAudioBuffer(Buffer.from(recording.data));
    } else {
      const basicAuth =
        interaction.type === "CALL" && twilioConfig
          ? { username: twilioConfig.accountSid, password: twilioConfig.authToken }
          : undefined;
      if (interaction.type === "CALL" && !basicAuth) {
        throw new Error("Twilio isn't connected, so this call recording can't be fetched.");
      }
      transcript = await transcribeRecording(interaction.recordingUrl, basicAuth);
    }
    await prisma.interaction.update({
      where: { id: interaction.id },
      data: { transcript, transcriptStatus: "DONE", transcriptError: null },
    });
    // Feed it straight to the Sales Coach the moment a transcript lands
    // — Vlad shouldn't have to remember to click "Analyze" for every
    // call. Fire-and-forget: a slow or failed coaching pass should never
    // hold up the transcription pipeline (the manual "Re-analyze" button
    // is still there if this silently fails, e.g. no ANTHROPIC_API_KEY).
    if (interaction.type === "CALL" || interaction.type === "VIDEO_CALL") {
      analyzeInteraction(interaction.id).catch((err) => {
        console.error(`[call-transcription] auto-analyze failed for ${interaction.id}:`, err);
      });
    }
    return { id: interaction.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : "transcription failed";
    await prisma.interaction.update({
      where: { id: interaction.id },
      data: { transcriptStatus: "FAILED", transcriptError: error },
    });
    return { id: interaction.id, error };
  }
}

// Mirrors transcribePendingPosts() in lib/content-performance.ts — same
// PENDING -> PROCESSING -> DONE/FAILED lifecycle. Covers three sources of
// recorded calls, all landing on the same Interaction fields:
//  - CALL (Twilio-bridged): the recording-status webhook sets
//    transcriptStatus to PENDING as soon as the recordingUrl lands.
//    Fetching it requires Twilio's own account credentials (Basic auth).
//  - CALL (live-recorded in-browser): record-call/route.ts sets PENDING
//    immediately and also kicks off transcribeInteractionNow() right away
//    (see below) — this batch pass is just the backstop in case that
//    fire-and-forget call didn't finish before the request ended.
//  - VIDEO_CALL: a Zoom (or other) discovery call logged with a recording
//    link but no pasted transcript — best-effort auto-transcription, no
//    auth. A link that needs a login to view will fail here; paste the
//    Zoom-generated transcript directly instead, which skips this
//    pipeline entirely (set straight to DONE on creation).
// See instrumentation.ts for the tick that calls this on a 2-minute
// cadence. Transcription itself runs locally (see integrations/assemblyai.ts,
// which despite its filename now runs an open-source Whisper model
// in-process instead of calling AssemblyAI) — no speaker labels, but no
// external vendor or API key either.
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
    // Claim it atomically — skip if something else (the immediate
    // fire-and-forget call below, or an overlapping tick) already grabbed
    // this row between the findMany above and now.
    const claimed = await prisma.interaction.updateMany({
      where: { id: interaction.id, transcriptStatus: "PENDING" },
      data: { transcriptStatus: "PROCESSING" },
    });
    if (claimed.count === 0) continue;
    const result = await transcribeOne(interaction, twilioConfig);
    if (result.error) {
      console.error(`[call-transcription] ${interaction.id} failed:`, result.error);
    }
    results.push(result);
  }
  return results;
}

// Transcribes one specific interaction right away instead of waiting for
// the next background tick (up to 2 minutes away) — called right after a
// recording is saved (Twilio webhook, or the "Record live call" upload) so
// it shows up in Sales Coach / the Communication Log as fast as
// AssemblyAI itself allows, not slower by however much of the tick
// interval happened to be left. Fire-and-forget: callers don't await
// this — instrumentation.ts's regular tick is still the backstop if the
// request ends before this finishes (Railway runs `next start` as one
// long-lived process, so the work isn't killed when the response returns).
export async function transcribeInteractionNow(interactionId: string) {
  if (!isCallTranscriptionConfigured()) return;
  try {
    const claimed = await prisma.interaction.updateMany({
      where: { id: interactionId, transcriptStatus: "PENDING" },
      data: { transcriptStatus: "PROCESSING" },
    });
    if (claimed.count === 0) return; // already being handled, or not actually pending
    const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
    if (!interaction) return;
    const twilioConfig = await getTwilioConfig();
    await transcribeOne(interaction, twilioConfig);
  } catch (err) {
    console.error("[call-transcription] transcribeInteractionNow failed:", err);
  }
}
