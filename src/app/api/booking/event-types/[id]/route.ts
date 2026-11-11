import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const QUESTION_TYPES = new Set(["TEXT", "TEXTAREA", "RADIO", "CHECKBOX", "DROPDOWN", "PHONE"]);

type QuestionInput = { id?: string; label: string; type: string; required?: boolean; options?: string[] };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.bookingEventType.findUnique({ where: { id } });
  if (!existing || (session.user.role !== "OWNER" && existing.hostUserId !== session.user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    name,
    description,
    durationMinutes,
    requiresQuestions,
    questions,
    location,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    minNoticeHours,
    dailyLimit,
    active,
  } = body as {
    name?: string;
    description?: string | null;
    durationMinutes?: number;
    requiresQuestions?: boolean;
    questions?: QuestionInput[];
    location?: string | null;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    minNoticeHours?: number;
    dailyLimit?: number | null;
    active?: boolean;
  };

  for (const q of questions || []) {
    if (!q.label || !q.label.trim()) return NextResponse.json({ error: "Every question needs a label." }, { status: 400 });
    if (!QUESTION_TYPES.has(q.type)) return NextResponse.json({ error: `Invalid question type: ${q.type}` }, { status: 400 });
  }

  const eventType = await prisma.$transaction(async (tx) => {
    await tx.bookingEventType.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
        ...(requiresQuestions !== undefined ? { requiresQuestions } : {}),
        ...(location !== undefined ? { location: location || null } : {}),
        ...(bufferBeforeMinutes !== undefined ? { bufferBeforeMinutes } : {}),
        ...(bufferAfterMinutes !== undefined ? { bufferAfterMinutes } : {}),
        ...(minNoticeHours !== undefined ? { minNoticeHours } : {}),
        ...(dailyLimit !== undefined ? { dailyLimit } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    // Questions are replaced wholesale on every save — simpler and safer
    // than diffing adds/edits/removals/reorders client-side, and a
    // handful of qualification questions per link is never going to be
    // large enough for that to matter performance-wise. Existing
    // BookingAnswer rows keep their own snapshotted label/answer text, so
    // past bookings' answers are unaffected by a later question edit.
    if (questions !== undefined) {
      await tx.bookingQuestion.deleteMany({ where: { eventTypeId: id } });
      await tx.bookingQuestion.createMany({
        data: questions.map((q, i) => ({
          eventTypeId: id,
          label: q.label.trim(),
          type: q.type as never,
          required: q.required ?? true,
          options: q.options || [],
          order: i,
        })),
      });
    }

    return tx.bookingEventType.findUnique({ where: { id }, include: { questions: { orderBy: { order: "asc" } } } });
  });

  return NextResponse.json({ eventType });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.bookingEventType.findUnique({ where: { id } });
  if (!existing || (session.user.role !== "OWNER" && existing.hostUserId !== session.user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.bookingEventType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
