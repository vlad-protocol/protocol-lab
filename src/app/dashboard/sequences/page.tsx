import { Repeat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { getOrSeedDefaultSequence } from "@/lib/sequences";
import { SequencesClient } from "./sequences-client";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const session = await requireAccess("sequences");

  // First-ever visit on an account with none yet gets a starter 3-step
  // sequence seeded automatically — see getOrSeedDefaultSequence for why.
  await getOrSeedDefaultSequence(session.user.id);

  const sequences = await prisma.emailSequence.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      steps: { orderBy: { order: "asc" } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <Repeat className="h-6 w-6 text-[var(--hq-accent)]" />
        Follow-up Sequences
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Automated multi-step email sequences for leads. Nothing here enrolls anyone
        automatically — enroll a lead from their contact page, and each step sends on
        its own schedule from whoever created the sequence's connected Gmail. A reply
        from the lead automatically pauses their enrollment. Use {"{{contactName}}"},{" "}
        {"{{companyName}}"}, and {"{{repName}}"} in the subject or body to personalize.
      </p>

      <SequencesClient
        initialSequences={sequences.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          enabled: s.enabled,
          activeCount: s._count.enrollments,
          createdBy: s.createdBy,
          steps: s.steps.map((st) => ({
            id: st.id,
            delayDays: st.delayDays,
            subject: st.subject,
            body: st.body,
          })),
        }))}
      />
    </div>
  );
}
