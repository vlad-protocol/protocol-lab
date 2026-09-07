import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const leads = await prisma.protocolLead.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { companyName, leadType } = body as { companyName?: string; leadType?: string };
  if (!companyName || !leadType) {
    return NextResponse.json({ error: "companyName and leadType are required." }, { status: 400 });
  }
  const lead = await prisma.protocolLead.create({
    data: { companyName, leadType: leadType as Prisma.ProtocolLeadCreateInput["leadType"] },
  });
  return NextResponse.json({ lead });
}
