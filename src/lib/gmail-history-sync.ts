import { prisma } from "@/lib/prisma";
import { listGmailMessagesPage, extractEmailAddresses, extractEmailAddress } from "@/lib/integrations/gmail";
import { mapEmailsToContactIds } from "@/lib/crm-contact";

// One-time backfill: walks every message in the connected Gmail
// account's mailbox — not just what's currently in Inbox or Sent, but
// everything "All Mail" would show (minus Spam/Trash) — and for each
// one, links it to every CRM contact whose email shows up in the To,
// Cc, or From header. So a lead shows up on their CRM timeline no
// matter which direction the email went (you sent it, they sent it),
// no matter whether they were the primary recipient or only cc'd, and
// regardless of whether the message still carries an INBOX or SENT
// label — an archived message keeps existing but loses the INBOX
// label, so an earlier version of this that walked SENT then INBOX by
// label silently missed anything already archived.
//
// A mailbox can hold thousands of messages, and Gmail's API is one
// message per network round-trip for headers, so this can't run in a
// single request without risking a timeout. Instead each call processes
// a bounded number of messages (respecting a wall-clock time budget) and
// persists a Gmail pageToken cursor so the next call picks up exactly
// where the last one left off. The client just calls this repeatedly
// until it reports done.
//
// Dedup is per (message, contact) pair rather than per message alone —
// deliberately, since one email can legitimately need to attach to
// several different leads (one in To, another in Cc).

const PAGE_SIZE = 20;
const NEXT_PHASE: Record<string, string> = { ALL: "DONE" };

export async function runGmailHistorySyncChunk(userId: string, budgetMs = 45_000) {
  const started = Date.now();
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("This user hasn't connected Gmail yet.");

  if (conn.historySyncDone) {
    return { done: true, phase: conn.historySyncPhase, processed: conn.historySyncProcessed, matched: conn.historySyncMatched };
  }

  if (!conn.historySyncStartedAt) {
    await prisma.gmailConnection.update({ where: { userId }, data: { historySyncStartedAt: new Date() } });
  }

  let phase = conn.historySyncPhase === "DONE" ? "ALL" : conn.historySyncPhase || "ALL";
  let cursor = conn.historySyncCursor || undefined;
  let processed = conn.historySyncProcessed;
  let matchedTotal = conn.historySyncMatched;
  let done = false;

  while (Date.now() - started < budgetMs && phase !== "DONE") {
    // [] walks the whole mailbox (minus Spam/Trash) rather than
    // restricting to a label, so an archived message that no longer
    // carries INBOX/SENT is still found. Direction is read per-message
    // below from its own labelIds, not assumed from which query found it.
    const { messages, nextPageToken } = await listGmailMessagesPage(userId, [], cursor, PAGE_SIZE);

    if (messages.length > 0) {
      const allAddresses = new Set<string>();
      for (const m of messages) {
        for (const addr of extractEmailAddresses(m.to)) allAddresses.add(addr);
        for (const addr of extractEmailAddresses(m.cc)) allAddresses.add(addr);
        for (const addr of extractEmailAddresses(m.from)) allAddresses.add(addr);
      }

      // Matches against a lead's primary email AND any additional
      // stakeholder emails recorded on it (see ContactPerson), so a
      // message to/from a secondary contact still links to the lead.
      const contactByEmail = await mapEmailsToContactIds(Array.from(allAddresses));

      // Build every (messageId, contactId) pair this page touches, then
      // find which pairs already exist so reruns (or a resumed sync
      // after a crash) never double-log the same link.
      type Pair = { externalId: string; contactId: string; m: typeof messages[number] };
      const pairs: Pair[] = [];
      for (const m of messages) {
        const addrs = new Set([
          ...extractEmailAddresses(m.to),
          ...extractEmailAddresses(m.cc),
          ...extractEmailAddresses(m.from),
        ]);
        const contactIdsForMessage = new Set<string>();
        for (const addr of addrs) {
          const contactId = contactByEmail.get(addr);
          if (contactId) contactIdsForMessage.add(contactId);
        }
        for (const contactId of contactIdsForMessage) {
          pairs.push({ externalId: m.id, contactId, m });
        }
      }

      if (pairs.length > 0) {
        const existing = await prisma.interaction.findMany({
          where: { externalId: { in: pairs.map((p) => p.externalId) } },
          select: { externalId: true, contactId: true },
        });
        const existingSet = new Set(existing.map((e) => `${e.externalId}:${e.contactId}`));
        const toCreate = pairs.filter((p) => !existingSet.has(`${p.externalId}:${p.contactId}`));

        if (toCreate.length > 0) {
          await prisma.interaction.createMany({
            data: toCreate.map((p) => {
              const parsedDate = new Date(p.m.date);
              // A message keeps SENT as long as it was sent from this
              // account, even after being archived — that's the
              // reliable per-message signal, not which query found it.
              const direction: "OUTBOUND" | "INBOUND" = p.m.labelIds.includes("SENT") ? "OUTBOUND" : "INBOUND";
              return {
                contactId: p.contactId,
                userId: direction === "OUTBOUND" ? userId : undefined,
                type: "EMAIL" as const,
                direction,
                subject: p.m.subject || null,
                body: p.m.snippet || null,
                fromAddress: extractEmailAddress(p.m.from) || p.m.from || null,
                toAddress: extractEmailAddress(p.m.to) || p.m.to || null,
                externalId: p.m.id,
                occurredAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
              };
            }),
          });
          matchedTotal += toCreate.length;
        }
      }

      processed += messages.length;
    }

    cursor = nextPageToken || undefined;
    if (!nextPageToken) {
      phase = NEXT_PHASE[phase];
      cursor = undefined;
      if (phase === "DONE") done = true;
    }

    // Persist progress after every page, not just at the end — if the
    // process restarts mid-sync (deploy, crash), it resumes from the
    // last completed page instead of from scratch.
    await prisma.gmailConnection.update({
      where: { userId },
      data: { historySyncPhase: phase, historySyncCursor: cursor, historySyncProcessed: processed, historySyncMatched: matchedTotal },
    });
  }

  await prisma.gmailConnection.update({
    where: { userId },
    data: {
      historySyncPhase: phase,
      historySyncCursor: done ? null : cursor,
      historySyncDone: done,
      historySyncProcessed: processed,
      historySyncMatched: matchedTotal,
    },
  });

  return { done, phase, processed, matched: matchedTotal };
}

export async function restartGmailHistorySync(userId: string) {
  await prisma.gmailConnection.update({
    where: { userId },
    data: {
      historySyncPhase: "ALL",
      historySyncCursor: null,
      historySyncDone: false,
      historySyncProcessed: 0,
      historySyncMatched: 0,
      historySyncStartedAt: new Date(),
    },
  });
}
