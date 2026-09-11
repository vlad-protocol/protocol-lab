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

  // Promotes this secondary person to be the lead's primary contact — the
  // one automated sequence emails actually send to (see resolveOutboundEmail
  // in crm-contact.ts, which deliberately never falls back to a secondary
  // person). Swaps rather than just overwrites: whatever the lead's current
  // primary name/email/phone was becomes a new secondary person record, so
  // promoting someone doesn't quietly lose the previous primary contact's
  // info.
  if (body.makePrimary) {
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const shouldPreservePrevious =
      contact.contactName && contact.contactName !== existing.name && (contact.email || contact.phone) && contact.email !== existing.email;

    await prisma.$transaction([
      ...(shouldPreservePrevious
        ? [
            prisma.contactPerson.create({
              data: {
                contactId: id,
                name: contact.contactName,
                email: contact.email,
                phone: contact.phone,
              },
            }),
          ]
        : []),
      prisma.contact.update({
        where: { id },
        data: {
          contactName: existing.name,
          email: existing.email,
          phone: existing.phone,
          title: existing.title,
        },
      }),
      prisma.contactPerson.delete({ where: { id: personId } }),
    ]);

    return NextResponse.json({ ok: true });
  }

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
