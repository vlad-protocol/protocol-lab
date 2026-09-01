import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reels = await prisma.reel.findMany({
    where: { userId: (session.user as { id: string }).id },
    orderBy: { postedAt: "desc" },
  });
  return NextResponse.json({ reels });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { platform, title, url, views, followersGained, postedAt, notes } = body as {
    platform?: string;
    title?: string;
    url?: string;
    views?: number;
    followersGained?: number;
    postedAt?: string;
    notes?: string;
  };

  if (!platform || !title || !postedAt) {
    return NextResponse.json(
      { error: "platform, title, and postedAt are required." },
      { status: 400 }
    );
  }

  const reel = await prisma.reel.create({
    data: {
      userId: (session.user as { id: string }).id,
      platform,
      title,
      url: url || null,
      views: views || 0,
      followersGained: followersGained || 0,
      postedAt: new Date(postedAt),
      notes: notes || null,
    },
  });

  return NextResponse.json({ reel });
}
