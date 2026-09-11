import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { runGmailHistorySyncChunk, restartGmailHistorySync } from "@/lib/gmail-history-sync";

// Reports current backfill progress without doing any work — what the
// UI polls to show a progress bar, and what it checks on page load to
// resume showing progress after a refresh mid-sync.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  if (!conn) return NextResponse.json({ error: "Gmail isn't connected." }, { status: 409 });

  return NextResponse.json({
    email: conn.email,
    running: !!conn.historySyncStartedAt && !conn.historySyncDone,
    done: conn.historySyncDone,
    processed: conn.historySyncProcessed,
    matched: conn.historySyncMatched,
    startedAt: conn.historySyncStartedAt,
  });
}

// Runs one bounded chunk of the Sent-mail backfill and returns straight
// away with progress so far — the client calls this in a loop until
// `done` comes back true. Pass { restart: true } to wipe prior progress
// and start over from the beginning of Sent mail.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  if (!conn) return NextResponse.json({ error: "Gmail isn't connected." }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  if (body?.restart) {
    await restartGmailHistorySync(session.user.id);
  }

  try {
    const result = await runGmailHistorySyncChunk(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed." },
      { status: 502 }
    );
  }
}
