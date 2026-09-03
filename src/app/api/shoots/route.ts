import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "shoots")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cards = await prisma.shootCard.findMany({
    include: {
      contact: { select: { id: true, companyName: true, contactName: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });
  return NextResponse.json({ cards });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "shoots")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, contactId, clientLabel, notes, dueDate } = body as {
    title?: string;
    contactId?: string;
    clientLabel?: string;
    notes?: string;
    dueDate?: string;
  };
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const last = await prisma.shootCard.findFirst({
    where: { stage: "SCRIPTING" },
    orderBy: { order: "desc" },
  });

  const card = await prisma.shootCard.create({
    data: {
      title,
      contactId: contactId || null,
      clientLabel: clientLabel || null,
      notes: notes || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      stage: "SCRIPTING",
      order: (last?.order ?? -1) + 1,
      createdById: session.user.id,
    },
    include: {
      contact: { select: { id: true, companyName: true, contactName: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ card });
}
