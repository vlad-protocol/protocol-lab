import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SEQUENCE_TEMPLATE } from "@/lib/sequences";

// One-time (repeatable) sync for the account's default cold-outreach
// sequence. getOrSeedDefaultSequence only ever creates a sequence when the
// account has none at all, so it can't refresh one that's already there —
// this route does that in place: same sequence id (so anything already
// enrolled on it keeps working, just against the new steps), overwriting
// name/description/steps with whatever DEFAULT_SEQUENCE_TEMPLATE currently
// holds, and turning requiresConfirmation on.
//
// Targets a sequence in either state:
//   1. still named "New Lead Follow-Up" (never migrated at all), or
//   2. already renamed to DEFAULT_SEQUENCE_TEMPLATE.name but stale — any
//      step missing its French version (bodyFr), which every step in the
//      current template has, is the tell that it predates the French
//      templates and needs re-syncing.
// A sequence already fully up to date (right name, every step has bodyFr)
// is left alone — this only overwrites something it can tell is outdated,
// never a sequence you've since customized on purpose past that point.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oldNamed = await prisma.emailSequence.findFirst({
    where: { name: "New Lead Follow-Up" },
  });

  const currentNamed = await prisma.emailSequence.findFirst({
    where: { name: DEFAULT_SEQUENCE_TEMPLATE.name },
    include: { steps: true },
  });
  const currentNamedIsStale = !!currentNamed && currentNamed.steps.some((s) => !s.bodyFr);

  const target = oldNamed || (currentNamedIsStale ? currentNamed : null);

  if (!target) {
    return NextResponse.json({
      migrated: false,
      reason: currentNamed
        ? `Already up to date — "${DEFAULT_SEQUENCE_TEMPLATE.name}" already has the current templates.`
        : 'No sequence named "New Lead Follow-Up" or "' + DEFAULT_SEQUENCE_TEMPLATE.name + '" was found — nothing to sync.',
    });
  }

  await prisma.$transaction([
    prisma.emailSequence.update({
      where: { id: target.id },
      data: {
        name: DEFAULT_SEQUENCE_TEMPLATE.name,
        description: DEFAULT_SEQUENCE_TEMPLATE.description,
        requiresConfirmation: true,
      },
    }),
    prisma.emailSequenceStep.deleteMany({ where: { sequenceId: target.id } }),
    prisma.emailSequenceStep.createMany({
      data: DEFAULT_SEQUENCE_TEMPLATE.steps.map((s) => ({ ...s, sequenceId: target.id })),
    }),
  ]);

  return NextResponse.json({ migrated: true, sequenceId: target.id, newName: DEFAULT_SEQUENCE_TEMPLATE.name });
}
