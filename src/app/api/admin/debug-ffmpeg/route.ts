import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";

// TEMPORARY diagnostic route — not linked from any UI. Checks whether
// scripts/stage-ffmpeg.js actually landed the binary at public/_bin/ffmpeg
// in this running container (the thing lib/integrations/assemblyai.ts now
// depends on), plus the raw ffmpeg-static package state for comparison
// against the old approach. Safe to delete once a few calls have
// transcribed cleanly after this deploy.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: Record<string, unknown> = { cwd: process.cwd() };

  const stagedPath = path.join(process.cwd(), "public", "_bin", "ffmpeg");
  try {
    const s = await stat(stagedPath);
    result.staged = { path: stagedPath, exists: true, size: s.size, mode: s.mode.toString(8) };
  } catch (err) {
    result.staged = { path: stagedPath, exists: false, error: err instanceof Error ? err.message : String(err) };
  }

  try {
    const ffmpegStaticModule: { default?: string | null } | string | null = await import("ffmpeg-static");
    const ffmpegStaticPath: string | null =
      typeof ffmpegStaticModule === "string" || ffmpegStaticModule === null
        ? ffmpegStaticModule
        : (ffmpegStaticModule.default ?? null);
    result.ffmpegStaticPath = ffmpegStaticPath;
    if (ffmpegStaticPath) {
      const pkgDir = path.dirname(ffmpegStaticPath);
      try {
        const entries = await readdir(pkgDir);
        result.ffmpegStaticPkgDirEntries = entries;
      } catch (err) {
        result.ffmpegStaticReaddirError = err instanceof Error ? err.message : String(err);
      }
    }
  } catch (err) {
    result.ffmpegStaticRequireError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
