import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a prebuilt binary (plain file named "ffmpeg", no
  // extension) plus an install.js that downloads it — neither is ever
  // reached via require()/import, so Next's output file tracing (which
  // only follows the static import graph to decide what to carry into
  // the production/standalone build) silently drops both, even though
  // node_modules/ffmpeg-static/index.js (which just computes the
  // binary's path as a string) traces in fine on its own. That's the
  // real reason call transcription kept failing — "ffmpeg ENOENT", then
  // "Cannot find module .../ffmpeg-static/install.js" — even after
  // confirming the npm install step itself completed cleanly: the files
  // were there right after `npm install`, then silently excluded when
  // Next assembled the deployable output. This tells the tracer to keep
  // the whole package regardless.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/ffmpeg-static/**/*"],
  },
};

export default nextConfig;
