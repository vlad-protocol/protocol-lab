import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "docs")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const docs = await prisma.docRecord.findMany({
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ docs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "docs")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, content, contactId } = body as { title?: string; content?: string; contactId?: string };
  if (!title || !content) {
    return NextResponse.json({ error: "title and content are required." }, { status: 400 });
  }
  const doc = await prisma.docRecord.create({
    data: { title, content, contactId: contactId || null, createdById: session.user.id },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ doc });
}
