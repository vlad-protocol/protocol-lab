import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Every pending draft waiting on manual review — a step from a
// requiresConfirmation sequence whose personalization has already been
// researched and merged into subject/body (see
// src/lib/sequence-drafts.ts), just not sent yet.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drafts = await prisma.sequenceStepDraft.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, number: true, contactName: true, companyName: true, email: true } },
          sequence: { select: { id: true, name: true, steps: { select: { id: true }, orderBy: { order: "asc" } } } },
        },
      },
    },
  });

  return NextResponse.json({ drafts });
}
