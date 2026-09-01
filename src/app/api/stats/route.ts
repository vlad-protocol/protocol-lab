import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "analytics")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await prisma.weeklyStat.findMany({
    where: { userId: (session.user as { id: string }).id },
    orderBy: { weekOf: "asc" },
  });
  return NextResponse.json({ stats });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "analytics")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { platform, weekOf, followerCount } = body as {
    platform?: string;
    weekOf?: string;
    followerCount?: number;
  };

  if (!platform || !weekOf || followerCount == null) {
    return NextResponse.json(
      { error: "platform, weekOf, and followerCount are required." },
      { status: 400 }
    );
  }

  const stat = await prisma.weeklyStat.upsert({
    where: {
      userId_platform_weekOf: {
        userId: (session.user as { id: string }).id,
        platform,
        weekOf: new Date(weekOf),
      },
    },
    update: { followerCount },
    create: {
      userId: (session.user as { id: string }).id,
      platform,
      weekOf: new Date(weekOf),
      followerCount,
    },
  });

  return NextResponse.json({ stat });
}
