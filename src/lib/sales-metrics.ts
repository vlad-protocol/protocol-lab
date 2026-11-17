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

// "Today"/"this week"/etc. must mean the rep's actual day, not the
// server's. Railway's container clock is UTC, so without this, "Today"
// at 6am in Montreal was starting at 7pm the *previous* evening Eastern
// time (UTC midnight), double-counting yesterday evening's activity as
// today's. Matches lib/booking.ts's DEFAULT_TIME_ZONE — the rest of this
// app already assumes Eastern/Montreal.
const BUSINESS_TZ = "America/Toronto";

// The real UTC-ms offset (negative for zones behind UTC, e.g. -18000000
// for Eastern Standard Time) that's in effect at `date` in `timeZone`.
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const p: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - date.getTime();
}

// The calendar date (and weekday, 0=Sun..6=Sat) that `date` falls on when
// viewed in `timeZone`.
function zonedYMD(date: Date, timeZone: string): { y: number; m: number; d: number; dow: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const p: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") p[part.type] = part.value;
  const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +p.year, m: +p.month, d: +p.day, dow: DOW[p.weekday] };
}

// Shifts a plain calendar date by `days` using pure UTC calendar math (no
// real time zone involved at this step) — safe from DST edge cases since
// it never represents a real instant until startOfDayInTz converts it.
function shiftYMD(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + days);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// The real UTC instant of local midnight on calendar date (y, m, d) in
// `timeZone`.
function startOfDayInTz(y: number, m: number, d: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const offsetMs = tzOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}

// Parses a "YYYY-MM-DD" string (from the dashboard's custom-range date
// inputs) as a calendar day in the business time zone, not UTC or the
// server's own clock.
export function startOfDateStringInTz(ymd: string, timeZone: string = BUSINESS_TZ): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return startOfDayInTz(y, m, d, timeZone);
}

export function endOfDateStringInTz(ymd: string, timeZone: string = BUSINESS_TZ): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = shiftYMD(y, m, d, 1);
  return new Date(startOfDayInTz(next.y, next.m, next.d, timeZone).getTime() - 1);
}

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

export type TouchPointBreakdown = { email: number; call: number; videoCall: number; text: number };

export type RepTotals = {
  userId: string | null;
  name: string;
  // Total outbound touches of any kind (email sent, call made, video call,
  // text/SMS) in the range — a call made counts here too, so this is a
  // superset of `dials`, not a separate pool. Follow-up touches are
  // ordinary Interactions of these same types, so they're already
  // included; there's no separate "follow-up" bucket to add. Goal per the
  // Playbook: 100/rep/day (see the touch_points_per_rep_day benchmark).
  touchPoints: number;
  touchPointBreakdown: TouchPointBreakdown;
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

export type TouchRow = {
  id: string;
  occurredAt: string;
  userId: string | null;
  repName: string;
  type: "EMAIL" | "CALL" | "VIDEO_CALL" | "TEXT";
  contactId: string;
  contactName: string;
  subject: string | null;
};

export type SalesMetrics = {
  from: string;
  to: string;
  team: RepTotals;
  byRep: RepTotals[];
  calls: CallRow[];
  touches: TouchRow[];
};

function emptyTotals(userId: string | null, name: string, dailyDialTarget: number | null = null): RepTotals {
  return {
    userId,
    name,
    touchPoints: 0,
    touchPointBreakdown: { email: 0, call: 0, videoCall: 0, text: 0 },
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

  // Touch points: every outbound email, call, video call, and text in
  // range — broader than `dials` (CALL only) on purpose, so a rep who's
  // all email that day isn't invisible here. A rep with touches but no
  // CALL interactions won't already be in byRepMap from the loop above,
  // so this also creates their row rather than assuming it exists.
  const touchInteractions = await prisma.interaction.findMany({
    where: {
      type: { in: ["EMAIL", "CALL", "VIDEO_CALL", "TEXT"] },
      direction: "OUTBOUND",
      occurredAt: { gte: from, lte: to },
      ...(repId ? { userId: repId } : {}),
    },
    select: {
      id: true,
      userId: true,
      type: true,
      occurredAt: true,
      subject: true,
      user: { select: { id: true, name: true, email: true, salesDailyDialTarget: true } },
      contact: { select: { id: true, companyName: true, contactName: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  const BREAKDOWN_KEY: Record<string, keyof TouchPointBreakdown> = {
    EMAIL: "email",
    CALL: "call",
    VIDEO_CALL: "videoCall",
    TEXT: "text",
  };

  const touchRows: TouchRow[] = [];

  for (const touch of touchInteractions) {
    const key = touch.userId || "unassigned";
    const name = touch.user?.name || touch.user?.email || "Unassigned";
    if (!byRepMap.has(key)) byRepMap.set(key, emptyTotals(touch.userId, name, touch.user?.salesDailyDialTarget ?? null));
    const rep = byRepMap.get(key)!;
    const breakdownKey = BREAKDOWN_KEY[touch.type];
    for (const bucket of [team, rep]) {
      bucket.touchPoints += 1;
      if (breakdownKey) bucket.touchPointBreakdown[breakdownKey] += 1;
    }

    touchRows.push({
      id: touch.id,
      occurredAt: touch.occurredAt.toISOString(),
      userId: touch.userId,
      repName: name,
      type: touch.type as TouchRow["type"],
      contactId: touch.contact.id,
      contactName: touch.contact.companyName || touch.contact.contactName,
      subject: touch.subject,
    });
  }

  const byRep = Array.from(byRepMap.values()).map(finalize).sort((a, b) => b.dials - a.dials);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    team: finalize(team),
    byRep,
    calls: rows,
    touches: touchRows,
  };
}

// Named ranges the dashboard offers — always computed against the
// server's clock at request time (not cached), but the day/week/month
// boundaries themselves are in BUSINESS_TZ, not the server's own clock
// or UTC. "custom" is handled by the caller (API route), which calls
// startOfDateStringInTz/endOfDateStringInTz instead of this.
export function resolveRange(range: string): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  const today = zonedYMD(now, BUSINESS_TZ);
  const startOfToday = startOfDayInTz(today.y, today.m, today.d, BUSINESS_TZ);

  switch (range) {
    case "today":
      return { from: startOfToday, to };
    case "week": {
      const daysSinceMonday = today.dow === 0 ? 6 : today.dow - 1;
      const monday = shiftYMD(today.y, today.m, today.d, -daysSinceMonday);
      return { from: startOfDayInTz(monday.y, monday.m, monday.d, BUSINESS_TZ), to };
    }
    case "month":
      return { from: startOfDayInTz(today.y, today.m, 1, BUSINESS_TZ), to };
    case "30d": {
      const start = shiftYMD(today.y, today.m, today.d, -29);
      return { from: startOfDayInTz(start.y, start.m, start.d, BUSINESS_TZ), to };
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
