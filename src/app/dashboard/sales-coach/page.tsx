import { GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { SalesCoachView } from "./sales-coach-view";
import { ISSUE_TAGS, STRENGTH_TAGS, labelFor } from "@/lib/sales-coach-tags";

export const dynamic = "force-dynamic";

export default async function SalesCoachPage() {
  await requireAccess("sales_coach");

  const calls = await prisma.interaction.findMany({
    where: { type: { in: ["CALL", "VIDEO_CALL"] }, transcriptStatus: "DONE", transcript: { not: null } },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { occurredAt: "desc" },
  });

  // Recurring-pattern counts — pure aggregation over whatever's already
  // been analyzed, zero extra AI cost. This is the whole point: a tag
  // that shows up on call after call is a real pattern worth fixing,
  // not a one-off. Analysis itself only runs when the user asks (see
  // /api/sales-coach/analyze) so this count only grows as fast as Vlad
  // actually reviews calls.
  const issueCounts = new Map<string, number>();
  const strengthCounts = new Map<string, number>();
  let analyzedCount = 0;
  for (const c of calls) {
    if (!c.coachingGeneratedAt) continue;
    analyzedCount++;
    for (const k of c.coachingIssueTags) issueCounts.set(k, (issueCounts.get(k) || 0) + 1);
    for (const k of c.coachingStrengthTags) strengthCounts.set(k, (strengthCounts.get(k) || 0) + 1);
  }
  const patterns = {
    analyzedCount,
    totalCount: calls.length,
    issues: [...issueCounts.entries()]
      .map(([key, count]) => ({ key, label: labelFor(ISSUE_TAGS, key), count }))
      .sort((a, b) => b.count - a.count),
    strengths: [...strengthCounts.entries()]
      .map(([key, count]) => ({ key, label: labelFor(STRENGTH_TAGS, key), count }))
      .sort((a, b) => b.count - a.count),
  };

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <GraduationCap className="h-6 w-6 text-[var(--hq-accent)]" />
          Sales Coach
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Every transcribed phone call and Zoom discovery call in one place. Analyze one to save its
          takeaways for good — what went well, what went wrong, what was missed — and watch the
          patterns below for anything that keeps happening across calls.
        </p>
      </div>

      <div className="mt-6">
        <SalesCoachView
          patterns={patterns}
          calls={calls.map((c) => ({
            id: c.id,
            type: c.type as "CALL" | "VIDEO_CALL",
            direction: c.direction as "INBOUND" | "OUTBOUND",
            occurredAt: c.occurredAt.toISOString(),
            durationSeconds: c.durationSeconds,
            transcript: c.transcript as string,
            contact: c.contact,
            coachingNotes: c.coachingNotes,
            coachingStrengthTags: c.coachingStrengthTags,
            coachingIssueTags: c.coachingIssueTags,
            coachingGeneratedAt: c.coachingGeneratedAt?.toISOString() || null,
          }))}
        />
      </div>
    </div>
  );
}
