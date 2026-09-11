import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Additional stakeholders/emails on a lead — see ContactPerson in
// prisma/schema.prisma. Listing is included on the lead GET already
// (via `include`), so this route is really just create; GET here is a
// convenience for refetching just the list after an edit.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const people = await prisma.contactPerson.findMany({
    where: { contactId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ people });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id }, select: { id: true } });
  if (!contact) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const person = await prisma.contactPerson.create({
    data: {
      contactId: id,
      name,
      title: (body.title as string) || null,
      email: (body.email as string) || null,
      phone: (body.phone as string) || null,
      notes: (body.notes as string) || null,
    },
  });

  return NextResponse.json({ person }, { status: 201 });
}
