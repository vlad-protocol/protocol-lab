import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
// @ts-expect-error - no types needed, just inspecting what ffmpeg-static resolves to
import ffmpegPath from "ffmpeg-static";

// TEMPORARY diagnostic route — not linked from any UI. Lets us see
// directly what's actually on disk in the running container around
// ffmpeg-static, instead of guessing from error messages alone. Safe to
// delete once the ffmpeg ENOENT issue is resolved for good.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: Record<string, unknown> = {
    cwd: process.cwd(),
    __dirname,
    ffmpegPath: ffmpegPath || null,
  };

  const pkgDir = ffmpegPath ? path.dirname(ffmpegPath as string) : null;
  result.pkgDir = pkgDir;

  if (pkgDir) {
    try {
      const entries = await readdir(pkgDir);
      result.pkgDirEntries = entries;
      const withStats: Record<string, unknown> = {};
      for (const e of entries) {
        try {
          const s = await stat(path.join(pkgDir, e));
          withStats[e] = { size: s.size, isFile: s.isFile(), mode: s.mode.toString(8) };
        } catch (err) {
          withStats[e] = { statError: err instanceof Error ? err.message : String(err) };
        }
      }
      result.pkgDirStats = withStats;
    } catch (err) {
      result.readdirError = err instanceof Error ? err.message : String(err);
    }
  }

  // Also check one level up (node_modules itself) to see if ffmpeg-static
  // is even present as a directory at all.
  const nodeModulesDir = pkgDir ? path.dirname(pkgDir) : null;
  if (nodeModulesDir) {
    try {
      const entries = await readdir(nodeModulesDir);
      result.nodeModulesHasFfmpegStatic = entries.includes("ffmpeg-static");
      result.nodeModulesSampleCount = entries.length;
    } catch (err) {
      result.nodeModulesReaddirError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(result);
}
