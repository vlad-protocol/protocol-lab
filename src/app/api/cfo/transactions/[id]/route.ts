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
  const existing = await prisma.cFOTransaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await req.json();
  const { category, description, amount, date, type } = body as {
    category?: string;
    description?: string;
    amount?: number;
    date?: string;
    type?: "INCOME" | "EXPENSE";
  };
  const transaction = await prisma.cFOTransaction.update({
    where: { id },
    data: {
      ...(category !== undefined ? { category } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(type !== undefined ? { type } : {}),
    },
  });
  return NextResponse.json({ transaction });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.cFOTransaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.cFOTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
