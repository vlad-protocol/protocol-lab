import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "recordings")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recordings = await prisma.recording.findMany({
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ recordings });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "recordings")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, url, kind, contactId, notes } = body as {
    title?: string;
    url?: string;
    kind?: "SCREEN" | "CALL" | "VIDEO";
    contactId?: string;
    notes?: string;
  };
  if (!title || !url) {
    return NextResponse.json({ error: "title and url are required." }, { status: 400 });
  }
  const recording = await prisma.recording.create({
    data: {
      title,
      url,
      kind: kind || "SCREEN",
      contactId: contactId || null,
      notes: notes || null,
      createdById: session.user.id,
    },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ recording });
}
