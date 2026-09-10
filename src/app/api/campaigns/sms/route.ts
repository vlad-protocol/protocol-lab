import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.smsCampaign.findMany({
    include: { _count: { select: { sends: true } } },
    orderBy: { createdAt: "desc" },
  });

  const withCounts = await Promise.all(
    campaigns.map(async (c) => {
      const grouped = await prisma.smsSend.groupBy({
        by: ["status"],
        where: { campaignId: c.id },
        _count: true,
      });
      const counts: Record<string, number> = {};
      for (const g of grouped) counts[g.status] = g._count;
      return { ...c, sendCounts: counts };
    })
  );

  return NextResponse.json({ campaigns: withCounts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, body: text, audienceFilter, scheduledAt } = body as {
    name?: string;
    body?: string;
    audienceFilter?: unknown;
    scheduledAt?: string | null;
  };

  if (!name || !text) {
    return NextResponse.json({ error: "name and body are required." }, { status: 400 });
  }

  const campaign = await prisma.smsCampaign.create({
    data: {
      name,
      body: text,
      audienceFilter: (audienceFilter as never) ?? undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ campaign });
}
