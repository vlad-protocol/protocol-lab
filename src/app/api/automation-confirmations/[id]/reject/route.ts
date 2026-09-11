import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { rejectDraft } from "@/lib/sequence-drafts";

// Rejects a pending draft without sending it. { action: "skip" } moves
// the lead on to the sequence's next step on schedule; { action: "cancel" }
// stops the whole sequence for this lead.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const { action } = (await req.json().catch(() => ({}))) as { action?: "skip" | "cancel" };
  if (action !== "skip" && action !== "cancel") {
    return NextResponse.json({ error: "action must be 'skip' or 'cancel'." }, { status: 400 });
  }

  try {
    await rejectDraft(id, action);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 502 });
  }
}
