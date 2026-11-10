import { GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { SalesCoachView } from "./sales-coach-view";
import { issueTagsFor, strengthTagsFor, labelFor, type CallKind } from "@/lib/sales-coach-tags";

export const dynamic = "force-dynamic";

// Cold calls and discovery/video calls are coached as two separate
// tracks — they have different goals (cold call: get booked on the
// video call; video call: close), so their recurring-pattern panels are
// built from each call kind's own tag vocabulary rather than pooled
// together, which would otherwise mix "didn't ask for the close" (a
// video-call problem) in with "pitched too long on the phone" (a
// cold-call problem) as if they were the same kind of mistake.
function buildPatterns(
  calls: { coachingGeneratedAt: Date | null; coachingIssueTags: string[]; coachingStrengthTags: string[] }[],
  kind: CallKind
) {
  const issueCounts = new Map<string, number>();
  const strengthCounts = new Map<string, number>();
  let analyzedCount = 0;
  for (const c of calls) {
    if (!c.coachingGeneratedAt) continue;
    analyzedCount++;
    for (const k of c.coachingIssueTags) issueCounts.set(k, (issueCounts.get(k) || 0) + 1);
    for (const k of c.coachingStrengthTags) strengthCounts.set(k, (strengthCounts.get(k) || 0) + 1);
  }
  const issueTags = issueTagsFor(kind);
  const strengthTags = strengthTagsFor(kind);
  return {
    analyzedCount,
    totalCount: calls.length,
    issues: [...issueCounts.entries()]
      .map(([key, count]) => ({ key, label: labelFor(issueTags, key), count }))
      .sort((a, b) => b.count - a.count),
    strengths: [...strengthCounts.entries()]
      .map(([key, count]) => ({ key, label: labelFor(strengthTags, key), count }))
      .sort((a, b) => b.count - a.count),
  };
}

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
  // not a one-off. Analysis itself runs automatically once a call's
  // transcript lands (see call-transcription.ts), or on demand via the
  // Analyze/Re-analyze button, so this count only grows as fast as
  // calls actually get transcribed and reviewed.
  const coldCalls = calls.filter((c) => c.type === "CALL");
  const discoveryCalls = calls.filter((c) => c.type === "VIDEO_CALL");
  const patterns = {
    coldCall: buildPatterns(coldCalls, "CALL"),
    discovery: buildPatterns(discoveryCalls, "VIDEO_CALL"),
  };

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <GraduationCap className="h-6 w-6 text-[var(--hq-accent)]" />
          Sales Coach
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Every transcribed phone call and Zoom discovery call in one place, coached against the goal
          of that call — a cold call's job is getting booked on the video call, a video call's job is
          closing. Transcripts are analyzed automatically; watch the patterns below for anything that
          keeps happening across calls of the same kind.
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
