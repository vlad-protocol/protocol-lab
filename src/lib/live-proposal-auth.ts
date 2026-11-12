import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";

// Shared guard for every /api/live-proposals route.
export async function liveProposalSession() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "live_proposal")) {
    return { session: null, denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, denied: null };
}
