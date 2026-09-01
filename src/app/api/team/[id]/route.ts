import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't change your own access." }, { status: 400 });
  }

  const body = await req.json();
  const { permissions, name } = body as { permissions?: string[]; name?: string };

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(permissions !== undefined && { permissions }),
      ...(name !== undefined && { name }),
    },
  });

  return NextResponse.json({ user: { id: user.id, permissions: user.permissions } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
