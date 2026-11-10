import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { analyzeInteraction } from "@/lib/sales-coach";

// Runs ONCE per call (on demand — the user clicks "Analyze", not
// automatically for every transcribed call — though transcription
// completing now also fires this automatically, see
// call-transcription.ts) and caches the result on the Interaction row.
// That's the whole cost-control story here: one Claude call per call
// reviewed, rather than re-deriving takeaways every time the chat is
// opened. Re-analyzing (same button, now "Re-analyze") overwrites the
// cached result — useful if the tag vocabulary changes or a transcript
// got corrected.
//
// The actual coaching logic (call-kind-aware prompt, tag vocabularies,
// Claude call, caching the result) lives in lib/sales-coach.ts so both
// this manual route and the automatic post-transcription trigger call
// the exact same code.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sales_coach")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { interactionId } = body as { interactionId?: string };
  if (!interactionId) return NextResponse.json({ error: "No call selected." }, { status: 400 });

  const result = await analyzeInteraction(interactionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    coachingNotes: result.notes,
    coachingStrengthTags: result.strengthTags,
    coachingIssueTags: result.issueTags,
    coachingGeneratedAt: result.generatedAt,
  });
}
