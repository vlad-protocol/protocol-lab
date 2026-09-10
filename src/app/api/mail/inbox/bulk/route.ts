import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { batchModifyGmailMessages } from "@/lib/integrations/gmail";

// Mirrors Gmail's own multi-select toolbar actions. Each is just a label
// add/remove — Gmail has no separate "archive" or "trash" concept beyond
// moving labels around (INBOX/TRASH), which is what makes batching these
// into one API call per action possible.
const ACTIONS: Record<string, { addLabelIds?: string[]; removeLabelIds?: string[] }> = {
  markRead: { removeLabelIds: ["UNREAD"] },
  markUnread: { addLabelIds: ["UNREAD"] },
  archive: { removeLabelIds: ["INBOX"] },
  trash: { addLabelIds: ["TRASH"], removeLabelIds: ["INBOX", "UNREAD"] },
  star: { addLabelIds: ["STARRED"] },
  unstar: { removeLabelIds: ["STARRED"] },
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ids, action } = body as { ids?: string[]; action?: string };

  if (!ids?.length || !action || !ACTIONS[action]) {
    return NextResponse.json(
      { error: `ids (non-empty) and a valid action (${Object.keys(ACTIONS).join(", ")}) are required.` },
      { status: 400 }
    );
  }

  try {
    await batchModifyGmailMessages(session.user.id, ids, ACTIONS[action]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update messages.";
    // A stale token missing the new gmail.modify scope shows up as a 403 —
    // give a specific nudge instead of a generic Gmail API error.
    const scopeHint = /insufficient|forbidden|403/i.test(message)
      ? " Try disconnecting and reconnecting Gmail — this feature needs a permission that wasn't granted the first time you connected."
      : "";
    return NextResponse.json({ error: message + scopeHint }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
