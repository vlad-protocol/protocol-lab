// Speaker-free transcription for recorded phone calls, run entirely inside
// this app's own Railway container — no external transcription vendor, no
// API key, no per-call cost. Uses @huggingface/transformers (the JS port of
// Hugging Face's transformers) running the open-source Whisper model
// on CPU via onnxruntime, plus a bundled static ffmpeg binary to decode
// whatever audio format the recording arrived in (Twilio mp3, or the
// browser MediaRecorder's webm/opus from "Record live call") down to the
// 16kHz mono PCM Whisper expects.
//
// Trade-off vs. the AssemblyAI version this replaced: no speaker
// diarization (AssemblyAI could tell the rep and the lead apart; this
// can't), and CPU inference is slower than a dedicated transcription API
// — a model stays loaded in memory after first use so later calls are
// fast, but the very first transcription after a deploy pays a one-time
// model-download + load cost (model is cached to disk after that).
//
// File kept named assemblyai.ts (not renamed) so lib/call-transcription.ts,
// which imports from here, didn't need touching — only these internals
// changed.

import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
// ffmpeg-static's default export is the absolute path to a static ffmpeg
// binary for this platform (string), or null if none is bundled for it.
import ffmpegPath from "ffmpeg-static";

// ffmpeg-static downloads its actual binary via its own npm "install"
// lifecycle script — which depends on install scripts being allowed to
// run at all. That's turned out to be fragile (npm's newer
// install-scripts allowlist silently skipped it on one deploy, and it's
// easy to imagine other ways a postinstall step gets dropped between
// build and the running container — a layer-caching quirk, a pruned
// image, etc.). Rather than relying on that happening correctly, check
// the binary is actually on disk right before we need it and, if not,
// run ffmpeg-static's own install script ourselves, once per container
// lifetime — self-healing regardless of why it went missing.
let ensureFfmpegPromise: Promise<string> | null = null;

async function ensureFfmpegBinary(): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static has no bundled binary for this platform.");
  if (!ensureFfmpegPromise) {
    ensureFfmpegPromise = (async () => {
      try {
        await access(ffmpegPath as string);
        return ffmpegPath as string;
      } catch {
        const installScript = path.join(path.dirname(ffmpegPath as string), "install.js");
        await new Promise<void>((resolve, reject) => {
          const proc = spawn(process.execPath, [installScript], { stdio: "inherit" });
          proc.on("error", reject);
          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg-static's install.js exited with code ${code} while fetching the ffmpeg binary.`));
          });
        });
        await access(ffmpegPath as string);
        return ffmpegPath as string;
      }
    })();
  }
  return ensureFfmpegPromise;
}

// Self-hosted — nothing to configure. Kept as a function (not a const)
// so callers don't need to change; it always returns true now.
export function isCallTranscriptionConfigured() {
  return true;
}

async function downloadRecording(recordingUrl: string, basicAuth?: { username: string; password: string }): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (basicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${basicAuth.username}:${basicAuth.password}`).toString("base64")}`;
  }
  const res = await fetch(recordingUrl, { headers });
  if (!res.ok) throw new Error(`Couldn't download the recording (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

// Decodes whatever audio container/codec we were handed into raw 16kHz
// mono PCM (as a Float32Array in [-1, 1]) using the bundled ffmpeg binary
// — avoids needing a separate audio-decoding library per input format.
async function decodeTo16kMonoPcm(input: Buffer): Promise<Float32Array> {
  const dir = await mkdtemp(path.join(tmpdir(), "call-audio-"));
  const inPath = path.join(dir, "in.audio");
  const outPath = path.join(dir, "out.raw");
  try {
    await writeFile(inPath, input);
    const resolvedFfmpegPath = await ensureFfmpegBinary();
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(resolvedFfmpegPath, [
        "-y",
        "-i", inPath,
        "-f", "f32le",
        "-ac", "1",
        "-ar", "16000",
        outPath,
      ]);
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      });
    });
    const raw = await readFile(outPath);
    return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

type AsrPipeline = (
  audio: Float32Array,
  opts: Record<string, unknown>
) => Promise<{ text: string }>;

// Loaded once per process and reused — the first transcription after a
// deploy or restart downloads the model (cached under the container's
// HF cache dir) and loads it into memory; every call after that reuses it.
let pipelinePromise: Promise<AsrPipeline> | null = null;

async function getPipeline(): Promise<AsrPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return (await pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
        dtype: "fp32",
      })) as unknown as AsrPipeline;
    })();
  }
  return pipelinePromise;
}

async function runWhisper(pcm: Float32Array): Promise<string> {
  const asr = await getPipeline();
  const result = await asr(pcm, { chunk_length_s: 30, stride_length_s: 5 });
  return (result.text || "").trim();
}

export async function transcribeRecording(
  recordingUrl: string,
  basicAuth?: { username: string; password: string }
): Promise<string> {
  const buffer = await downloadRecording(recordingUrl, basicAuth);
  return transcribeAudioBuffer(buffer);
}

export async function transcribeAudioBuffer(buffer: Buffer): Promise<string> {
  const pcm = await decodeTo16kMonoPcm(buffer);
  return runWhisper(pcm);
}
