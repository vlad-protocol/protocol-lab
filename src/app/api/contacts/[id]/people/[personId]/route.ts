import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const STRING_FIELDS = ["name", "title", "email", "phone", "notes"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, personId } = await params;

  const existing = await prisma.contactPerson.findUnique({ where: { id: personId } });
  if (!existing || existing.contactId !== id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of STRING_FIELDS) {
    if (key in body) data[key] = body[key] === "" ? null : (body[key] as string);
  }
  // name is required on the model — never let an edit blank it out.
  if ("name" in data && !data.name) delete data.name;

  const person = await prisma.contactPerson.update({ where: { id: personId }, data });
  return NextResponse.json({ person });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, personId } = await params;

  const existing = await prisma.contactPerson.findUnique({ where: { id: personId } });
  if (!existing || existing.contactId !== id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.contactPerson.delete({ where: { id: personId } });
  return NextResponse.json({ ok: true });
}
