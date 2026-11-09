import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { caption, scheduledFor, videoUrl, instagramConnectionId } = body as {
    caption?: string;
    scheduledFor?: string;
    videoUrl?: string;
    instagramConnectionId?: string | null;
  };
  const post = await prisma.contentPost.update({
    where: { id },
    data: {
      ...(caption !== undefined && { caption }),
      ...(scheduledFor !== undefined && { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(instagramConnectionId !== undefined && { instagramConnectionId: instagramConnectionId || null }),
    },
  });
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.contentPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
