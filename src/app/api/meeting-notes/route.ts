import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "copilot")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notes = await prisma.meetingNote.findMany({
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "copilot")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, contactId, transcript, summary, decisions, actionItems } = body as {
    title?: string;
    contactId?: string;
    transcript?: string;
    summary?: string;
    decisions?: string;
    actionItems?: string;
  };
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const note = await prisma.meetingNote.create({
    data: {
      title,
      contactId: contactId || null,
      transcript: transcript || null,
      summary: summary || null,
      decisions: decisions || null,
      actionItems: actionItems || null,
      createdById: session.user.id,
    },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ note });
}
