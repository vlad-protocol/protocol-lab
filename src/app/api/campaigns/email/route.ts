import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { blocksToPlainText } from "@/lib/campaigns";
import type { EmailBlock, EmailSettings } from "@/lib/email-blocks";

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
      const [grouped, openedCount, clickedCount] = await Promise.all([
        prisma.emailSend.groupBy({ by: ["status"], where: { campaignId: c.id }, _count: true }),
        prisma.emailSend.count({ where: { campaignId: c.id, openedAt: { not: null } } }),
        prisma.emailSend.count({ where: { campaignId: c.id, clickCount: { gt: 0 } } }),
      ]);
      const counts: Record<string, number> = {};
      for (const g of grouped) counts[g.status] = g._count;
      return { ...c, sendCounts: counts, openedCount, clickedCount };
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
  const {
    name,
    subject,
    body: html,
    blocks,
    settings,
    audienceFilter,
    scheduledAt,
  } = body as {
    name?: string;
    subject?: string;
    body?: string;
    blocks?: EmailBlock[];
    settings?: EmailSettings;
    audienceFilter?: unknown;
    scheduledAt?: string | null;
  };

  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
  if (!name || !subject || (!html && !hasBlocks)) {
    return NextResponse.json({ error: "name, subject, and a body or visual builder content are required." }, { status: 400 });
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      name,
      subject,
      body: hasBlocks ? blocksToPlainText(blocks) : html || "",
      blocks: hasBlocks ? (blocks as never) : undefined,
      settings: hasBlocks && settings ? (settings as never) : undefined,
      audienceFilter: (audienceFilter as never) ?? undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ campaign });
}
