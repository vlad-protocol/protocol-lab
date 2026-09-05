import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.cFOGoal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await req.json();
  const { savedSoFar, targetAmount, name, targetDate } = body as {
    savedSoFar?: number;
    targetAmount?: number;
    name?: string;
    targetDate?: string | null;
  };
  const goal = await prisma.cFOGoal.update({
    where: { id },
    data: {
      ...(savedSoFar !== undefined ? { savedSoFar } : {}),
      ...(targetAmount !== undefined ? { targetAmount } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate) : null } : {}),
    },
  });
  return NextResponse.json({ goal });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.cFOGoal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.cFOGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
