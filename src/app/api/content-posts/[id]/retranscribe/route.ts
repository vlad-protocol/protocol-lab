import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Just resets status back to PENDING — the next tick (every 2 minutes)
  // picks it up via transcribePendingPosts(). See lib/content-performance.ts.
  await prisma.instagramPost.update({
    where: { id },
    data: { transcriptStatus: "PENDING", transcriptError: null, contentCategory: null, categoryReasoning: null },
  });
  return NextResponse.json({ ok: true });
}
