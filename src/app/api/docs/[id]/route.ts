import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "docs")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { title, content, status } = body as {
    title?: string;
    content?: string;
    status?: "DRAFT" | "SENT" | "SIGNED";
  };
  const doc = await prisma.docRecord.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(status !== undefined ? { status, ...(status === "SENT" ? { sentAt: new Date() } : {}) } : {}),
    },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ doc });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "docs")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.docRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
