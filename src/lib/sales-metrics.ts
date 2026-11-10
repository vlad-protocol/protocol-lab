import { prisma } from "@/lib/prisma";

// Call-tracking metrics for the Sales dashboard (/dashboard/sales) — pure
// aggregation over the existing Interaction log, nothing new to log here.
// A rep tags a call's outcome either on the manual "Log call" form or with
// the quick selector on any CALL entry in a lead's Communication Log (see
// timeline.tsx) — this just counts what's already there.

export type CallOutcome = "NO_ANSWER" | "VOICEMAIL" | "CONNECTED_NOT_BOOKED" | "DEMO_BOOKED" | "RESCHEDULED";

export type RepTotals = {
  userId: string | null;
  name: string;
  callsMade: number;
  connected: number; // CONNECTED_NOT_BOOKED + DEMO_BOOKED + RESCHEDULED — a human picked up
  noAnswer: number;
  voicemail: number;
  demoBooked: number;
  connectedNotBooked: number;
  rescheduled: number;
  untagged: number; // logged but no outcome set yet
  connectRate: number | null; // connected / callsMade
  bookingRate: number | null; // demoBooked / connected
};

export type SalesMetrics = {
  from: string;
  to: string;
  team: RepTotals;
  byRep: RepTotals[];
};

function emptyTotals(userId: string | null, name: string): RepTotals {
  return {
    userId,
    name,
    callsMade: 0,
    connected: 0,
    noAnswer: 0,
    voicemail: 0,
    demoBooked: 0,
    connectedNotBooked: 0,
    rescheduled: 0,
    untagged: 0,
    connectRate: null,
    bookingRate: null,
  };
}

function finalize(t: RepTotals): RepTotals {
  t.connectRate = t.callsMade > 0 ? t.connected / t.callsMade : null;
  t.bookingRate = t.connected > 0 ? t.demoBooked / t.connected : null;
  return t;
}

export async function computeSalesMetrics(opts: { from: Date; to: Date; repId?: string }): Promise<SalesMetrics> {
  const { from, to, repId } = opts;

  const calls = await prisma.interaction.findMany({
    where: {
      type: "CALL",
      direction: "OUTBOUND",
      occurredAt: { gte: from, lte: to },
      ...(repId ? { userId: repId } : {}),
    },
    select: { userId: true, callOutcome: true, user: { select: { id: true, name: true, email: true } } },
  });

  const team = emptyTotals(null, "Team");
  const byRepMap = new Map<string, RepTotals>();

  for (const call of calls) {
    const key = call.userId || "unassigned";
    const name = call.user?.name || call.user?.email || "Unassigned";
    if (!byRepMap.has(key)) byRepMap.set(key, emptyTotals(call.userId, name));
    const rep = byRepMap.get(key)!;

    for (const bucket of [team, rep]) {
      bucket.callsMade += 1;
      switch (call.callOutcome as CallOutcome | null) {
        case "NO_ANSWER":
          bucket.noAnswer += 1;
          break;
        case "VOICEMAIL":
          bucket.voicemail += 1;
          break;
        case "CONNECTED_NOT_BOOKED":
          bucket.connectedNotBooked += 1;
          bucket.connected += 1;
          break;
        case "DEMO_BOOKED":
          bucket.demoBooked += 1;
          bucket.connected += 1;
          break;
        case "RESCHEDULED":
          bucket.rescheduled += 1;
          bucket.connected += 1;
          break;
        default:
          bucket.untagged += 1;
      }
    }
  }

  const byRep = Array.from(byRepMap.values()).map(finalize).sort((a, b) => b.callsMade - a.callsMade);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    team: finalize(team),
    byRep,
  };
}

// Named ranges the dashboard offers — always computed against the server's
// clock at request time, not cached.
export function resolveRange(range: string): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (range) {
    case "today":
      return { from: startOfToday, to };
    case "week": {
      const from = new Date(startOfToday);
      const day = from.getDay();
      const diff = from.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      from.setDate(diff);
      return { from, to };
    }
    case "month": {
      const from = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
      return { from, to };
    }
    case "30d": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 29);
      return { from, to };
    }
    default:
      return { from: startOfToday, to };
  }
}
