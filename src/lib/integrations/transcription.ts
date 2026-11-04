// Speech-to-text for Instagram Reels — Claude's Messages API has no audio
// input, so this is the one new vendor the content-performance feature
// needs. Uses OpenAI's Whisper endpoint: a single REST call, accepts mp4
// directly (no separate audio-extraction step), and costs a few cents
// per reel. Set OPENAI_API_KEY in Railway to enable it.

export function isTranscriptionConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

export async function transcribeVideo(videoBuffer: Buffer, filename = "reel.mp4"): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY isn't set — required for reel transcription.");

  const form = new FormData();
  const bytes = new Uint8Array(videoBuffer);
  form.append("file", new Blob([bytes], { type: "video/mp4" }), filename);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Whisper transcription failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.text as string) || "";
}
