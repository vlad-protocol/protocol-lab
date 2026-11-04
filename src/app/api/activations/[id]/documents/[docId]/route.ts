import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, docId } = await params;
  const existing = await prisma.sopDocument.findUnique({ where: { id: docId } });
  if (!existing || existing.activationId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { name?: string; fields?: Record<string, string>; rows?: Record<string, unknown[]> };
  const document = await prisma.sopDocument.update({
    where: { id: docId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.fields !== undefined ? { fields: body.fields as object } : {}),
      ...(body.rows !== undefined ? { rows: body.rows as object } : {}),
    },
  });
  return NextResponse.json({ document });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, docId } = await params;
  const existing = await prisma.sopDocument.findUnique({ where: { id: docId } });
  if (!existing || existing.activationId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.sopDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
