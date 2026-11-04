import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const events = await prisma.marketingEvent.findMany({
    include: { posts: { select: { id: true, caption: true, thumbnailUrl: true, contentCategory: true } } },
    orderBy: { eventDate: "desc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, eventDate, pricing, platform, zeffyCampaignId, rsvpCount, notes } = body as {
    name?: string;
    eventDate?: string;
    pricing?: "PAID" | "FREE";
    platform?: "ZEFFY" | "PARTIFUL";
    zeffyCampaignId?: string;
    rsvpCount?: number;
    notes?: string;
  };
  if (!name || !eventDate || !pricing || !platform) {
    return NextResponse.json({ error: "name, eventDate, pricing, and platform are required." }, { status: 400 });
  }

  const event = await prisma.marketingEvent.create({
    data: {
      name,
      eventDate: new Date(eventDate),
      pricing,
      platform,
      zeffyCampaignId: platform === "ZEFFY" ? zeffyCampaignId || null : null,
      rsvpCount: platform === "PARTIFUL" ? rsvpCount ?? null : null,
      notes: notes || null,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ event });
}
