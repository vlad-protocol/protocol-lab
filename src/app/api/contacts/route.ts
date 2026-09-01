import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.contact.findMany({
    include: {
      assignedRep: { select: { id: true, name: true, email: true } },
      interactions: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { interactions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, contactName, title, email, phone, status, tags, notes, assignedRepId } =
    body as {
      companyName?: string;
      contactName?: string;
      title?: string;
      email?: string;
      phone?: string;
      status?: string;
      tags?: string[];
      notes?: string;
      assignedRepId?: string;
    };

  if (!contactName) {
    return NextResponse.json({ error: "contactName is required." }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      companyName: companyName || null,
      contactName,
      title: title || null,
      email: email || null,
      phone: phone || null,
      status: (status as "LEAD" | "ACTIVE" | "CLIENT" | "CLOSED") || "LEAD",
      tags: tags || [],
      notes: notes || null,
      assignedRepId: assignedRepId || session.user.id,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ contact });
}
