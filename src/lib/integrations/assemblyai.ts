// Speaker-diarized transcription for recorded phone calls. Twilio records
// the call (see integrations/twilio.ts) and hands us an mp3 URL; Claude's
// Messages API has no audio input and Whisper (used for Instagram Reels,
// see integrations/transcription.ts) has no speaker diarization, so this
// is a second vendor: AssemblyAI, which tells speakers apart. Set
// ASSEMBLYAI_API_KEY in Railway to enable it.

const BASE = "https://api.assemblyai.com/v2";

export function isCallTranscriptionConfigured() {
  return !!process.env.ASSEMBLYAI_API_KEY;
}

// Twilio's recording URL requires your Twilio account's own credentials
// (Basic auth) to fetch — AssemblyAI can't be pointed at it directly, so
// we download the audio ourselves first and re-upload the bytes.
async function downloadRecording(recordingUrl: string, basicAuth?: { username: string; password: string }): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (basicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${basicAuth.username}:${basicAuth.password}`).toString("base64")}`;
  }
  const res = await fetch(recordingUrl, { headers });
  if (!res.ok) throw new Error(`Couldn't download the recording (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToAssemblyAi(buffer: Buffer, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { Authorization: apiKey },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`AssemblyAI upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json.upload_url as string;
}

type AssemblyTranscript = {
  status: "queued" | "processing" | "completed" | "error";
  error?: string;
  text?: string;
  utterances?: { speaker: string; text: string }[];
};

async function pollTranscript(id: string, apiKey: string): Promise<AssemblyTranscript> {
  const POLL_INTERVAL_MS = 3000;
  const MAX_WAIT_MS = 5 * 60 * 1000; // a typical sales call finishes transcribing well within this
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const res = await fetch(`${BASE}/transcript/${id}`, { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`AssemblyAI polling failed (${res.status}).`);
    const json: AssemblyTranscript = await res.json();
    if (json.status === "completed") return json;
    if (json.status === "error") throw new Error(json.error || "AssemblyAI transcription failed.");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for AssemblyAI to finish transcribing.");
}

// Returns a transcript broken into turns, each labeled "Speaker A" /
// "Speaker B", etc. AssemblyAI tells speakers apart but doesn't know which
// one is the rep vs. the lead — the reader infers that from context (the
// rep is almost always whoever speaks first, right after the call connects).
//
// basicAuth is only needed for a Twilio recording URL (Twilio requires your
// account credentials to fetch it). A Zoom (or other) recording link that's
// directly downloadable needs no auth — pass none. A Zoom link that
// requires signing in to view will fail here; paste that recording's own
// Zoom-generated transcript directly instead (see the Video call form).
export async function transcribeRecording(
  recordingUrl: string,
  basicAuth?: { username: string; password: string }
): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY isn't set — required for call transcription.");

  const buffer = await downloadRecording(recordingUrl, basicAuth);
  const uploadUrl = await uploadToAssemblyAi(buffer, apiKey);

  const createRes = await fetch(`${BASE}/transcript`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url: uploadUrl, speaker_labels: true }),
  });
  if (!createRes.ok) {
    throw new Error(`AssemblyAI transcript request failed (${createRes.status}): ${(await createRes.text()).slice(0, 300)}`);
  }
  const { id } = await createRes.json();
  const result = await pollTranscript(id, apiKey);

  const utterances = result.utterances || [];
  if (utterances.length === 0) {
    // Fell back to plain text — e.g. a very short or single-speaker
    // recording where diarization found nothing to split.
    return result.text || "";
  }
  return utterances.map((u) => `Speaker ${u.speaker}: ${u.text}`).join("\n\n");
}
