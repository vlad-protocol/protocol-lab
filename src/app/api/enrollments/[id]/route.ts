import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Pause / resume / cancel one contact's enrollment in a sequence.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { status } = body as { status?: "ACTIVE" | "PAUSED" | "CANCELED" };
  if (!status || !["ACTIVE", "PAUSED", "CANCELED"].includes(status)) {
    return NextResponse.json({ error: "status must be ACTIVE, PAUSED, or CANCELED." }, { status: 400 });
  }

  const enrollment = await prisma.sequenceEnrollment.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });

  // Resuming (from PAUSED or REPLIED) makes the next step due right away
  // rather than trying to reconstruct whatever the original delay was.
  const nextSendAt = status === "ACTIVE" ? new Date() : status === "CANCELED" ? null : enrollment.nextSendAt;

  const updated = await prisma.sequenceEnrollment.update({
    where: { id },
    data: { status, nextSendAt },
  });

  return NextResponse.json({ enrollment: updated });
}
