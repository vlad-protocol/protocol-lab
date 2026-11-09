import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const posts = await prisma.contentPost.findMany({
    include: {
      script: { select: { id: true, title: true, hook: true } },
      instagramPost: { select: { id: true, permalink: true, thumbnailUrl: true, views: true, likes: true } },
      instagramConnection: { select: { id: true, username: true, label: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });
  return NextResponse.json({ posts });
}

// Schedules a finished script onto the calendar. No video is published
// here — that's the separate /publish action once videoUrl is set — this
// just reserves the slot, same as writing it on a whiteboard.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { scriptId, caption, scheduledFor, videoUrl, instagramConnectionId } = body as {
    scriptId?: string;
    caption?: string;
    scheduledFor?: string;
    videoUrl?: string;
    instagramConnectionId?: string;
  };
  const post = await prisma.contentPost.create({
    data: {
      scriptId: scriptId || null,
      caption: caption?.trim() || null,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      videoUrl: videoUrl?.trim() || null,
      instagramConnectionId: instagramConnectionId || null,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ post });
}
