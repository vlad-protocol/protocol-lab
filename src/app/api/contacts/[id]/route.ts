import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      assignedRep: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      interactions: {
        orderBy: { occurredAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { companyName, contactName, title, email, phone, status, tags, notes, assignedRepId } =
    body as Record<string, unknown>;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(companyName !== undefined && { companyName: companyName as string | null }),
      ...(contactName !== undefined && { contactName: contactName as string }),
      ...(title !== undefined && { title: title as string | null }),
      ...(email !== undefined && { email: email as string | null }),
      ...(phone !== undefined && { phone: phone as string | null }),
      ...(status !== undefined && { status: status as "LEAD" | "ACTIVE" | "CLIENT" | "CLOSED" }),
      ...(tags !== undefined && { tags: tags as string[] }),
      ...(notes !== undefined && { notes: notes as string | null }),
      ...(assignedRepId !== undefined && { assignedRepId: assignedRepId as string | null }),
    },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  // Deleting a contact (and its whole interaction history) is destructive,
  // so it's owner-only regardless of the "people" module toggle.
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
