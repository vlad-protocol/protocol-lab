import { prisma } from "@/lib/prisma";

// Interaction types that count as "you reached out" — a plain logged
// NOTE, or anything INBOUND (a reply/call/text you received), isn't a
// touch you made, so callers only call this for an outbound
// email/call/text/video call, right after creating the Interaction row.
const TOUCH_TYPES = new Set(["EMAIL", "CALL", "TEXT", "VIDEO_CALL"]);

export function isTouchInteraction(type: string, direction: string) {
  return direction === "OUTBOUND" && TOUCH_TYPES.has(type);
}

// Bumps a lead's touch bookkeeping for ONE new outbound interaction:
// totalTouches +1, lastContactDate moved up to occurredAt (only ever
// forward — never lets an older backfilled message push it backwards),
// and dateFirstContacted set if this is the very first contact ever
// recorded.
export async function recordContactTouch(contactId: string, occurredAt: Date = new Date()) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { dateFirstContacted: true, lastContactDate: true },
  });
  if (!contact) return;
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      totalTouches: { increment: 1 },
      ...(!contact.lastContactDate || occurredAt > contact.lastContactDate
        ? { lastContactDate: occurredAt }
        : {}),
      ...(contact.dateFirstContacted ? {} : { dateFirstContacted: occurredAt }),
    },
  });
}

// Recomputes a lead's touch bookkeeping from scratch, straight off the
// Interaction rows that still exist — used after deleting a logged
// interaction (see the interaction DELETE route), since we don't know
// whether the row being removed was the one that set lastContactDate/
// dateFirstContacted/totalTouches in the first place. Safer than trying
// to decrement in place.
export async function recomputeContactTouches(contactId: string) {
  const touches = await prisma.interaction.findMany({
    where: { contactId, direction: "OUTBOUND", type: { in: ["EMAIL", "CALL", "TEXT", "VIDEO_CALL"] } },
    select: { occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      totalTouches: touches.length,
      dateFirstContacted: touches[0]?.occurredAt || null,
      lastContactDate: touches[touches.length - 1]?.occurredAt || null,
    },
  });
}

// Batch version for a historical sync (e.g. Gmail history backfill) that
// just bulk-inserted many Interaction rows at once via createMany — one
// DB round trip per affected contact instead of per message.
export async function recordContactTouchesBatch(
  touches: { contactId: string; count: number; latestAt: Date }[]
) {
  for (const t of touches) {
    if (t.count <= 0) continue;
    const contact = await prisma.contact.findUnique({
      where: { id: t.contactId },
      select: { dateFirstContacted: true, lastContactDate: true },
    });
    if (!contact) continue;
    await prisma.contact.update({
      where: { id: t.contactId },
      data: {
        totalTouches: { increment: t.count },
        ...(!contact.lastContactDate || t.latestAt > contact.lastContactDate
          ? { lastContactDate: t.latestAt }
          : {}),
        ...(contact.dateFirstContacted ? {} : { dateFirstContacted: t.latestAt }),
      },
    });
  }
}
