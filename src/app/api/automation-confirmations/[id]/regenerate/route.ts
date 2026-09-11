import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { regenerateDraftResearch } from "@/lib/sequence-drafts";

// Re-runs live research for one pending draft on demand — for a thin or
// failed first pass (e.g. the research API key was out of credits) or a
// lead whose details changed since it was drafted. Rebuilds subject/body
// from the template with fresh research, same as the original draft.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const draft = await regenerateDraftResearch(id, baseUrl);
    return NextResponse.json({ subject: draft.subject, body: draft.body, researchNotes: draft.researchNotes });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to regenerate." }, { status: 502 });
  }
}
