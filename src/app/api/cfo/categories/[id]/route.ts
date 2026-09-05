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
  const existing = await prisma.cFOBudgetCategory.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await req.json();
  const { label, monthlyBudget, order } = body as { label?: string; monthlyBudget?: number; order?: number };
  const category = await prisma.cFOBudgetCategory.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(monthlyBudget !== undefined ? { monthlyBudget } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });
  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.cFOBudgetCategory.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.cFOBudgetCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
