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
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id },
    include: { sends: { orderBy: { createdAt: "asc" }, take: 500 } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

// Editing is only allowed while a campaign is still a DRAFT — once it's
// queued/sending/sent, the audience and sends are already frozen.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft campaigns can be edited." }, { status: 400 });
  }

  const body = await req.json();
  const { name, subject, body: html, audienceFilter, scheduledAt } = body as {
    name?: string;
    subject?: string;
    body?: string;
    audienceFilter?: unknown;
    scheduledAt?: string | null;
  };

  const campaign = await prisma.emailCampaign.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(html !== undefined ? { body: html } : {}),
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
  await prisma.emailCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
