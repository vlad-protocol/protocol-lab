import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, category, body: text, sortOrder } = body as {
    title?: string;
    category?: string;
    body?: string;
    sortOrder?: number;
  };
  const script = await prisma.salesScript.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(text !== undefined ? { body: text } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      updatedById: session.user.id,
    },
  });
  return NextResponse.json({ script });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.salesScript.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
