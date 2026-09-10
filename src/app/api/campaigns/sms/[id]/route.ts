import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const campaign = await prisma.smsCampaign.findUnique({
    where: { id },
    include: { sends: { orderBy: { createdAt: "asc" }, take: 500 } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.smsCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft campaigns can be edited." }, { status: 400 });
  }

  const body = await req.json();
  const { name, body: text, audienceFilter, scheduledAt } = body as {
    name?: string;
    body?: string;
    audienceFilter?: unknown;
    scheduledAt?: string | null;
  };

  const campaign = await prisma.smsCampaign.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(text !== undefined ? { body: text } : {}),
      ...(audienceFilter !== undefined ? { audienceFilter: audienceFilter as never } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
    },
  });

  return NextResponse.json({ campaign });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.smsCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
