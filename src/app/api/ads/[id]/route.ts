import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "ads")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { status, spend, results } = body as {
    status?: "ACTIVE" | "PAUSED" | "ENDED";
    spend?: number;
    results?: string;
  };
  const campaign = await prisma.adCampaign.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(spend !== undefined ? { spend } : {}),
      ...(results !== undefined ? { results } : {}),
    },
    include: { client: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ campaign });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "ads")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.adCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
