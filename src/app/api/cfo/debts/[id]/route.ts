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
  const existing = await prisma.cFODebt.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await req.json();
  const { balance, monthlyPayment, name } = body as { balance?: number; monthlyPayment?: number; name?: string };
  const debt = await prisma.cFODebt.update({
    where: { id },
    data: {
      ...(balance !== undefined ? { balance } : {}),
      ...(monthlyPayment !== undefined ? { monthlyPayment } : {}),
      ...(name !== undefined ? { name } : {}),
    },
  });
  return NextResponse.json({ debt });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.cFODebt.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.cFODebt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
