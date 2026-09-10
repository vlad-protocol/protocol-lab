import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.contact.findMany({
    include: {
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
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, contactName, type, title, email, phone, notes } = body as {
    companyName?: string;
    contactName?: string;
    type?: string;
    title?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  if (!companyName && !contactName) {
    return NextResponse.json({ error: "companyName or contactName is required." }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      companyName: companyName || null,
      // A lead can be added with just a company name (e.g. a sponsor
      // prospect with no known contact person yet) — contactName is
      // required on the model, so fall back to the company name.
      contactName: contactName || companyName!,
      type: (type as "CLIENT" | "SPONSOR" | "VENUE") || "CLIENT",
      title: title || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ contact });
}
