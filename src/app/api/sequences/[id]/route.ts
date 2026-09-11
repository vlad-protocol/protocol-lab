import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { name, description, enabled, requiresConfirmation, steps } = body as {
    name?: string;
    description?: string | null;
    enabled?: boolean;
    requiresConfirmation?: boolean;
    steps?: {
      delayDays: number;
      subject: string;
      body: string;
      researchAngle?: string | null;
      subjectFr?: string | null;
      bodyFr?: string | null;
    }[];
  };

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (enabled !== undefined) data.enabled = enabled;
  if (requiresConfirmation !== undefined) data.requiresConfirmation = requiresConfirmation;

  // Steps are replaced wholesale rather than diffed — simplest correct
  // option given a sequence is edited as a whole form, not field-by-field.
  // In-flight enrollments reference steps by ORDER (an integer), not by
  // step id, so replacing the rows is safe as long as the new step list
  // still has a step at whatever index an enrollment is currently on.
  if (steps) {
    await prisma.$transaction([
      prisma.emailSequenceStep.deleteMany({ where: { sequenceId: id } }),
      prisma.emailSequenceStep.createMany({
        data: steps.map((s, i) => ({
          sequenceId: id,
          order: i,
          delayDays: Math.max(0, Number(s.delayDays) || 0),
          subject: s.subject,
          body: s.body,
          researchAngle: s.researchAngle?.trim() || null,
          subjectFr: s.subjectFr?.trim() || null,
          bodyFr: s.bodyFr?.trim() || null,
        })),
      }),
    ]);
  }

  if (Object.keys(data).length > 0) {
    await prisma.emailSequence.update({ where: { id }, data });
  }

  const sequence = await prisma.emailSequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ sequence });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await prisma.emailSequence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
