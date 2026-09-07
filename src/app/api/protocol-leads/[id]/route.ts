import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// Fields the pipeline table can edit inline. Kept as a whitelist so a
// stray/unexpected key in the request body can't touch anything else.
const STRING_FIELDS = [
  "companyName",
  "industry",
  "contactName",
  "contactTitle",
  "phone",
  "email",
  "website",
  "source",
  "assignedRep",
  "lastConversationSummary",
  "nextStep",
  "followUpOwner",
  "eventOpportunity",
  "notes",
] as const;
const DATE_FIELDS = ["dateFirstContacted", "lastContactDate", "nextFollowUpDate"] as const;
const ENUM_FIELDS = ["leadType", "priority", "status"] as const;
const NUMBER_FIELDS = ["totalTouches", "dealValue"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.protocolLead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (key in body) data[key] = body[key] === "" ? null : (body[key] as string);
  }
  for (const key of ENUM_FIELDS) {
    if (key in body) data[key] = body[key] === "" ? null : (body[key] as string);
  }
  for (const key of DATE_FIELDS) {
    if (key in body) {
      const v = body[key] as string | null;
      data[key] = v ? new Date(v) : null;
    }
  }
  for (const key of NUMBER_FIELDS) {
    if (key in body) {
      const v = body[key];
      data[key] = v === "" || v === null || v === undefined ? (key === "totalTouches" ? 0 : null) : Number(v);
    }
  }

  const lead = await prisma.protocolLead.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
  });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.protocolLead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.protocolLead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
