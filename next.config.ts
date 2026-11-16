import type { NextConfig } from "next";

// No ffmpeg-related tracing config here on purpose. An earlier fix tried
// outputFileTracingIncludes to force node_modules/ffmpeg-static/** into
// the build (see git history on this file around Nov 11 for the old
// comment) — it didn't actually work (install.js kept vanishing from the
// deployed container anyway), and it's not needed anymore: ffmpeg is now
// staged into public/_bin/ffmpeg at build time (scripts/stage-ffmpeg.js,
// wired into "prebuild"/"predev" in package.json) and referenced by a
// plain string-literal path in lib/integrations/assemblyai.ts, which Next
// ships verbatim regardless of tracing. See that file for the full story.
const nextConfig: NextConfig = {};

export default nextConfig;
