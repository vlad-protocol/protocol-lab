import { prisma } from "@/lib/prisma";
import { listGmailMessagesPage, extractEmailAddresses, extractEmailAddress } from "@/lib/integrations/gmail";

// One-time backfill: walks every message in the connected Gmail
// account's Sent mail, then every message in Inbox — not just the last
// N of either — and for each one, links it to every CRM contact whose
// email shows up in the To, Cc, or From header. So a lead shows up on
// their CRM timeline no matter which direction the email went (you sent
// it, they sent it) and no matter whether they were the primary
// recipient or only cc'd.
//
// A mailbox can hold thousands of messages, and Gmail's API is one
// message per network round-trip for headers, so this can't run in a
// single request without risking a timeout. Instead each call processes
// a bounded number of messages (respecting a wall-clock time budget) and
// persists a Gmail pageToken cursor plus which phase (Sent vs Inbox)
// it's in, so the next call picks up exactly where the last one left
// off. The client just calls this repeatedly until it reports done.
//
// Dedup is per (message, contact) pair rather than per message alone —
// deliberately, since one email can legitimately need to attach to
// several different leads (one in To, another in Cc).

const PAGE_SIZE = 25;
const PHASE_LABELS: Record<string, string[]> = { SENT: ["SENT"], INBOX: ["INBOX"] };
const NEXT_PHASE: Record<string, string> = { SENT: "INBOX", INBOX: "DONE" };

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

  let phase = conn.historySyncPhase || "SENT";
  let cursor = conn.historySyncCursor || undefined;
  let processed = conn.historySyncProcessed;
  let matchedTotal = conn.historySyncMatched;
  let done = false;

  while (Date.now() - started < budgetMs && phase !== "DONE") {
    const direction = phase === "SENT" ? "OUTBOUND" : "INBOUND";
    const { messages, nextPageToken } = await listGmailMessagesPage(userId, PHASE_LABELS[phase], cursor, PAGE_SIZE);

    if (messages.length > 0) {
      const allAddresses = new Set<string>();
      for (const m of messages) {
        for (const addr of extractEmailAddresses(m.to)) allAddresses.add(addr);
        for (const addr of extractEmailAddresses(m.cc)) allAddresses.add(addr);
        for (const addr of extractEmailAddresses(m.from)) allAddresses.add(addr);
      }

      const contacts = allAddresses.size
        ? await prisma.contact.findMany({
            where: { email: { in: Array.from(allAddresses), mode: "insensitive" } },
            select: { id: true, email: true },
          })
        : [];
      const contactByEmail = new Map(contacts.map((c) => [c.email!.toLowerCase(), c.id]));

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
              return {
                contactId: p.contactId,
                userId: direction === "OUTBOUND" ? userId : undefined,
                type: "EMAIL" as const,
                direction: direction as "OUTBOUND" | "INBOUND",
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
      historySyncPhase: "SENT",
      historySyncCursor: null,
      historySyncDone: false,
      historySyncProcessed: 0,
      historySyncMatched: 0,
      historySyncStartedAt: new Date(),
    },
  });
}
