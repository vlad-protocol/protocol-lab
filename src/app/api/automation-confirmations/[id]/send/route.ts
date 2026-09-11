import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendConfirmedDraft } from "@/lib/sequence-drafts";

// Confirms and sends a pending draft. Accepts an optional final
// subject/body so a last-second edit doesn't need a separate PATCH
// round-trip before this call.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { subject?: string; body?: string };
  if (body.subject !== undefined || body.body !== undefined) {
    const existing = await prisma.sequenceStepDraft.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "This draft has already been handled." }, { status: 409 });
    }
    await prisma.sequenceStepDraft.update({
      where: { id },
      data: {
        ...(body.subject !== undefined ? { subject: body.subject } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
      },
    });
  }

  try {
    await sendConfirmedDraft(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send." }, { status: 502 });
  }
}
