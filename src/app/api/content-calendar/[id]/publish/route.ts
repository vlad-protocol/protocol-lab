import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { publishInstagramReel, isInstagramConfigured } from "@/lib/integrations/instagram";

// Actually pushes a scheduled post to Instagram. Needs videoUrl set (a
// publicly reachable link to the finished, edited video — this app
// doesn't generate or host video itself) and the Instagram connection to
// be live. On success, stores the returned media id directly — the next
// regular sync (syncInstagramContent) will fill in the rest of that
// InstagramPost row's metrics and link it to this ContentPost.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram isn't configured yet — connect it in Settings." }, { status: 400 });
  }
  const { id } = await params;
  const post = await prisma.contentPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (!post.videoUrl) {
    return NextResponse.json({ error: "Add a video URL to this post before publishing." }, { status: 400 });
  }
  if (!post.instagramConnectionId) {
    return NextResponse.json({ error: "Pick which connected account to publish this to first." }, { status: 400 });
  }

  try {
    const igMediaId = await publishInstagramReel(post.instagramConnectionId, post.videoUrl, post.caption || "");
    const instagramPost = await prisma.instagramPost.upsert({
      where: { igMediaId },
      create: {
        igMediaId,
        caption: post.caption,
        transcriptStatus: "PENDING",
        instagramConnectionId: post.instagramConnectionId,
      },
      update: { instagramConnectionId: post.instagramConnectionId },
    });
    const updated = await prisma.contentPost.update({
      where: { id },
      data: { status: "PUBLISHED", instagramPostId: instagramPost.id, publishError: null },
    });
    return NextResponse.json({ post: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    await prisma.contentPost.update({ where: { id }, data: { status: "FAILED", publishError: message } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
