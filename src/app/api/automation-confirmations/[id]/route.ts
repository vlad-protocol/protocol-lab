import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Saves edits to a still-pending draft (correcting the researched
// observation, tightening the subject, etc.) without sending it.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.sequenceStepDraft.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "This draft has already been handled." }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { subject?: string; body?: string };
  const data: Record<string, unknown> = {};
  if (body.subject !== undefined) data.subject = body.subject;
  if (body.body !== undefined) data.body = body.body;

  const draft = await prisma.sequenceStepDraft.update({ where: { id }, data });
  return NextResponse.json({ draft });
}
