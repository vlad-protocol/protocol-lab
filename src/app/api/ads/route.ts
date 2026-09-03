import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "ads")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const campaigns = await prisma.adCampaign.findMany({
    include: { client: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "ads")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, platform, clientId, budget, spend, results, status, notes } = body as {
    name?: string;
    platform?: string;
    clientId?: string;
    budget?: number;
    spend?: number;
    results?: string;
    status?: "ACTIVE" | "PAUSED" | "ENDED";
    notes?: string;
  };
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const campaign = await prisma.adCampaign.create({
    data: {
      name,
      platform: platform || "meta",
      clientId: clientId || null,
      budget: budget ?? null,
      spend: spend ?? null,
      results: results || null,
      status: status || "ACTIVE",
      notes: notes || null,
      createdById: session.user.id,
    },
    include: { client: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ campaign });
}
