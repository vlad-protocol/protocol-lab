import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SEQUENCE_TEMPLATE } from "@/lib/sequences";

// One-time migration for accounts that already had a sequence auto-seeded
// (named "New Lead Follow-Up") before the Sponsor Cold Outreach templates
// existed. getOrSeedDefaultSequence only ever creates a sequence when the
// account has none at all, so it can't upgrade one that's already there —
// this route does that upgrade in place: same sequence id (so anything
// already enrolled on it keeps working, just against the new steps), new
// name/description/steps, and requiresConfirmation flipped on.
//
// Only touches a sequence literally named "New Lead Follow-Up" so it can
// never clobber something you built or renamed yourself. Safe to call more
// than once — once that name is gone, it's a no-op.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = await prisma.emailSequence.findFirst({
    where: { name: "New Lead Follow-Up" },
  });

  if (!target) {
    const alreadyMigrated = await prisma.emailSequence.findFirst({
      where: { name: DEFAULT_SEQUENCE_TEMPLATE.name },
    });
    return NextResponse.json({
      migrated: false,
      reason: alreadyMigrated
        ? `Already migrated — a "${DEFAULT_SEQUENCE_TEMPLATE.name}" sequence already exists.`
        : 'No sequence named "New Lead Follow-Up" was found — nothing to migrate.',
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
