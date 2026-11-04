import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { name, eventDate, pricing, platform, zeffyCampaignId, rsvpCount, notes, postIds } = body as {
    name?: string;
    eventDate?: string;
    pricing?: "PAID" | "FREE";
    platform?: "ZEFFY" | "PARTIFUL";
    zeffyCampaignId?: string | null;
    rsvpCount?: number | null;
    notes?: string | null;
    postIds?: string[]; // when present, replaces the full set of linked posts
  };

  const event = await prisma.marketingEvent.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(eventDate !== undefined && { eventDate: new Date(eventDate) }),
      ...(pricing !== undefined && { pricing }),
      ...(platform !== undefined && { platform }),
      ...(zeffyCampaignId !== undefined && { zeffyCampaignId }),
      ...(rsvpCount !== undefined && { rsvpCount }),
      ...(notes !== undefined && { notes }),
      ...(postIds !== undefined && { posts: { set: postIds.map((id) => ({ id })) } }),
    },
    include: { posts: { select: { id: true, caption: true, thumbnailUrl: true, contentCategory: true } } },
  });
  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.marketingEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
