import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const members = await prisma.protocolListMember.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, notes } = body as {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  const cleanEmail = email?.trim() || null;
  const cleanPhone = phone?.trim() || null;
  if (!cleanEmail && !cleanPhone) {
    return NextResponse.json({ error: "Add at least an email or a phone number." }, { status: 400 });
  }

  const member = await prisma.protocolListMember.create({
    data: {
      name: name?.trim() || null,
      email: cleanEmail,
      phone: cleanPhone,
      notes: notes?.trim() || null,
      source: "MANUAL",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ member });
}
