import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reel = await prisma.reel.findUnique({ where: { id } });
  if (!reel || reel.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.reel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
