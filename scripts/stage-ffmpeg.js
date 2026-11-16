// Copies ffmpeg-static's binary to public/_bin/ffmpeg at build time, so the
// decode step in lib/integrations/assemblyai.ts can reach it with a plain
// literal path (path.join(process.cwd(), "public", "_bin", "ffmpeg"))
// instead of a runtime value computed from the ffmpeg-static package.
//
// Why this exists: Next's Turbopack build warned that spawning ffmpeg with
// a dynamically-resolved path ("Dynamic filesystem access causes tracing
// of the whole project") forces it to fall back to tracing the whole
// project for that route — and even then, ffmpeg-static's install.js
// (only ever reached via child_process.spawn, never require()'d) kept
// vanishing from the deployed container ("Cannot find module
// .../ffmpeg-static/install.js"), which is what made every self-healing
// attempt before this one fail too. public/ is the one thing Next ships
// verbatim in every output mode, tracing or no tracing, so copying the
// binary there at build time — before Turbopack computes anything —
// sidesteps the whole problem instead of trying to out-guess the tracer.
//
// Runs via "prebuild"/"predev" in package.json, so it's already done by
// the time `next build` or `next dev` starts.
const fs = require("node:fs");
const path = require("node:path");

const DEST_DIR = path.join(process.cwd(), "public", "_bin");
const DEST_PATH = path.join(DEST_DIR, "ffmpeg");

function binaryLooksValid(p) {
  try {
    const stat = fs.statSync(p);
    // ffmpeg-static's real binary is tens of MB; a few KB file here means
    // a previous download was interrupted/corrupted, not a real binary.
    return stat.size > 1024 * 1024;
  } catch {
    return false;
  }
}

async function main() {
  // Re-resolve ffmpeg-static's own binary path fresh each run — don't cache
  // this value anywhere else in the codebase.
  const ffmpegStaticPath = require("ffmpeg-static");
  if (!ffmpegStaticPath) {
    throw new Error("ffmpeg-static has no bundled binary for this build platform.");
  }

  if (!binaryLooksValid(ffmpegStaticPath)) {
    // npm's install-scripts allowlist, a pruned image, or a flaky download
    // can all leave this missing — run the package's own install step
    // ourselves, once, right here at build time (full network + fs access
    // guaranteed, unlike at runtime in the deployed container).
    console.log("[stage-ffmpeg] ffmpeg-static binary missing or too small — running its install step...");
    const installScript = path.join(path.dirname(ffmpegStaticPath), "install.js");
    delete require.cache[require.resolve(installScript)];
    require(installScript);
    // install.js kicks off an async download; ffmpeg-static's own install
    // step doesn't export a promise, so poll for the binary to land rather
    // than assuming require() finishing means the download finished.
    const deadline = Date.now() + 60_000;
    while (!binaryLooksValid(ffmpegStaticPath)) {
      if (Date.now() > deadline) {
        throw new Error("ffmpeg-static's install step did not produce a valid binary within 60s.");
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });
  fs.copyFileSync(ffmpegStaticPath, DEST_PATH);
  fs.chmodSync(DEST_PATH, 0o755);
  console.log(`[stage-ffmpeg] staged ${DEST_PATH} (${fs.statSync(DEST_PATH).size} bytes)`);
}

main().catch((err) => {
  console.error("[stage-ffmpeg] failed:", err);
  process.exit(1);
});
