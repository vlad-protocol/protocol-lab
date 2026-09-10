import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { name, email, phone, notes } = body as {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  const existing = await prisma.protocolListMember.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextEmail = email !== undefined ? email?.trim() || null : existing.email;
  const nextPhone = phone !== undefined ? phone?.trim() || null : existing.phone;
  if (!nextEmail && !nextPhone) {
    return NextResponse.json({ error: "Keep at least an email or a phone number." }, { status: 400 });
  }

  const member = await prisma.protocolListMember.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name?.trim() || null } : {}),
      ...(email !== undefined ? { email: nextEmail } : {}),
      ...(phone !== undefined ? { phone: nextPhone } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
  });

  return NextResponse.json({ member });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.protocolListMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
