import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.emailCampaign.findMany({
    include: { _count: { select: { sends: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Cheap per-campaign send-status counts for the list view, without
  // pulling every EmailSend row over the wire.
  const withCounts = await Promise.all(
    campaigns.map(async (c) => {
      const grouped = await prisma.emailSend.groupBy({
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
  const { name, subject, body: html, audienceFilter, scheduledAt } = body as {
    name?: string;
    subject?: string;
    body?: string;
    audienceFilter?: unknown;
    scheduledAt?: string | null;
  };

  if (!name || !subject || !html) {
    return NextResponse.json({ error: "name, subject, and body are required." }, { status: 400 });
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      name,
      subject,
      body: html,
      audienceFilter: (audienceFilter as never) ?? undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ campaign });
}
