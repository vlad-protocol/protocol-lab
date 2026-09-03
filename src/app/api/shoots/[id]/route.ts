import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "shoots")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { stage, order, title, notes, dueDate, contactId, clientLabel } = body as {
    stage?: "SCRIPTING" | "FILM" | "EDITING" | "READY" | "POSTED";
    order?: number;
    title?: string;
    notes?: string;
    dueDate?: string | null;
    contactId?: string | null;
    clientLabel?: string | null;
  };

  const card = await prisma.shootCard.update({
    where: { id },
    data: {
      ...(stage !== undefined ? { stage } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(contactId !== undefined ? { contactId: contactId || null } : {}),
      ...(clientLabel !== undefined ? { clientLabel: clientLabel || null } : {}),
    },
    include: {
      contact: { select: { id: true, companyName: true, contactName: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ card });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "shoots")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.shootCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
