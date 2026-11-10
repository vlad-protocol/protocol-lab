import { prisma } from "@/lib/prisma";

// Call-tracking metrics for the Sales dashboard (/dashboard/sales) — pure
// aggregation over the existing Interaction log, matching the Protocol
// Sales Playbook's funnel exactly: Dial -> Pitch -> Conversation ->
// Booked -> Held -> Won. A rep tags a call's furthest stage reached
// either on the manual "Log call" form or with the quick selector on any
// CALL entry in a lead's Communication Log (see timeline.tsx) — this just
// counts what's already there. Show rate and close rate need the Video
// Calls module (Playbook build phase 2, not built yet) so they're
// reported as unavailable rather than faked from call data alone.

export type CallStageReached =
  | "NO_ANSWER"
  | "VOICEMAIL"
  | "GATEKEEPER"
  | "OWNER_REACHED"
  | "PITCHED"
  | "CONVERSATION_2MIN"
  | "VIDEO_CALL_BOOKED";

const OWNER_REACHED_STAGES: CallStageReached[] = ["OWNER_REACHED", "PITCHED", "CONVERSATION_2MIN", "VIDEO_CALL_BOOKED"];
const PITCHED_STAGES: CallStageReached[] = ["PITCHED", "CONVERSATION_2MIN", "VIDEO_CALL_BOOKED"];
const CONVERSATION_STAGES: CallStageReached[] = ["CONVERSATION_2MIN", "VIDEO_CALL_BOOKED"];

export type RepTotals = {
  userId: string | null;
  name: string;
  dials: number;
  noAnswer: number;
  voicemail: number;
  gatekeeper: number;
  ownerReached: number;
  pitched: number;
  conversation: number;
  videoCallBooked: number;
  qualityNoes: number;
  untagged: number;
  pickupRate: number | null; // ownerReached / dials
  pitchRate: number | null; // pitched / ownerReached
  conversationRate: number | null; // conversation / ownerReached
  bookingRate: number | null; // videoCallBooked / ownerReached
  dailyDialTarget: number | null;
};

export type CallRow = {
  id: string;
  occurredAt: string;
  userId: string | null;
  repName: string;
  contactId: string;
  contactName: string;
  callStageReached: CallStageReached | null;
  resultTag: string;
  durationSeconds: number | null;
};

export type SalesMetrics = {
  from: string;
  to: string;
  team: RepTotals;
  byRep: RepTotals[];
  calls: CallRow[];
};

function emptyTotals(userId: string | null, name: string, dailyDialTarget: number | null = null): RepTotals {
  return {
    userId,
    name,
    dials: 0,
    noAnswer: 0,
    voicemail: 0,
    gatekeeper: 0,
    ownerReached: 0,
    pitched: 0,
    conversation: 0,
    videoCallBooked: 0,
    qualityNoes: 0,
    untagged: 0,
    pickupRate: null,
    pitchRate: null,
    conversationRate: null,
    bookingRate: null,
    dailyDialTarget,
  };
}

function finalize(t: RepTotals): RepTotals {
  t.pickupRate = t.dials > 0 ? t.ownerReached / t.dials : null;
  t.pitchRate = t.ownerReached > 0 ? t.pitched / t.ownerReached : null;
  t.conversationRate = t.ownerReached > 0 ? t.conversation / t.ownerReached : null;
  t.bookingRate = t.ownerReached > 0 ? t.videoCallBooked / t.ownerReached : null;
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
    select: {
      id: true,
      userId: true,
      callStageReached: true,
      resultTag: true,
      objectionAttempts: true,
      lastQuestionAsked: true,
      occurredAt: true,
      durationSeconds: true,
      user: { select: { id: true, name: true, email: true, salesDailyDialTarget: true } },
      contact: { select: { id: true, companyName: true, contactName: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  const team = emptyTotals(null, "Team");
  const byRepMap = new Map<string, RepTotals>();
  const rows: CallRow[] = [];

  for (const call of calls) {
    const key = call.userId || "unassigned";
    const name = call.user?.name || call.user?.email || "Unassigned";
    if (!byRepMap.has(key)) byRepMap.set(key, emptyTotals(call.userId, name, call.user?.salesDailyDialTarget ?? null));
    const rep = byRepMap.get(key)!;

    const stage = call.callStageReached as CallStageReached | null;
    const isQualityNo = call.resultTag === "NOT_INTERESTED" && call.objectionAttempts >= 2 && call.lastQuestionAsked;

    for (const bucket of [team, rep]) {
      bucket.dials += 1;
      if (isQualityNo) bucket.qualityNoes += 1;
      if (!stage) {
        bucket.untagged += 1;
        continue;
      }
      if (stage === "NO_ANSWER") bucket.noAnswer += 1;
      if (stage === "VOICEMAIL") bucket.voicemail += 1;
      if (stage === "GATEKEEPER") bucket.gatekeeper += 1;
      if (OWNER_REACHED_STAGES.includes(stage)) bucket.ownerReached += 1;
      if (PITCHED_STAGES.includes(stage)) bucket.pitched += 1;
      if (CONVERSATION_STAGES.includes(stage)) bucket.conversation += 1;
      if (stage === "VIDEO_CALL_BOOKED") bucket.videoCallBooked += 1;
    }

    rows.push({
      id: call.id,
      occurredAt: call.occurredAt.toISOString(),
      userId: call.userId,
      repName: name,
      contactId: call.contact.id,
      contactName: call.contact.companyName || call.contact.contactName,
      callStageReached: stage,
      resultTag: call.resultTag,
      durationSeconds: call.durationSeconds,
    });
  }

  const byRep = Array.from(byRepMap.values()).map(finalize).sort((a, b) => b.dials - a.dials);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    team: finalize(team),
    byRep,
    calls: rows,
  };
}

// Named ranges the dashboard offers — always computed against the server's
// clock at request time, not cached. "custom" is handled by the caller
// (API route), which passes explicit from/to instead of calling this.
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

export type BenchmarkStatus = "red" | "amber" | "green" | null;

export function benchmarkStatus(value: number | null, amberMin: number, greenMin: number): BenchmarkStatus {
  if (value == null) return null;
  if (value >= greenMin) return "green";
  if (value >= amberMin) return "amber";
  return "red";
}
