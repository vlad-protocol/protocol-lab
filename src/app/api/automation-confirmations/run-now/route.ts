import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { runDueSequenceDraftGeneration } from "@/lib/sequence-drafts";

// Manual trigger for the same draft-generation pass the background tick
// runs every couple of minutes (see instrumentation.ts) — lets someone who
// just enrolled a lead see the draft right away instead of waiting for the
// next tick.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const results = await runDueSequenceDraftGeneration(baseUrl);

  return NextResponse.json({
    checked: results.length,
    drafted: results.filter((r) => r.drafted).length,
    results,
  });
}
