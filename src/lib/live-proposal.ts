// Live Proposal: everything that isn't UI or routing.
//   - FIELD_DEFS: the discovery answers a proposal needs, each with the
//     question to ask on the call (drives the "ask next" list).
//   - extractFields(): Claude reads the transcript and fills fields.
//   - generateConcepts(): Claude drafts 3 concepts from the call, working
//     from the concept bank + the SOP's event formula.
//   - deckNumbers(): every number on the deck, computed here (never by the
//     AI) from the fields + price tier, following Operations Manual v2.2.

import { CONCEPT_BANK } from "./live-proposal-concepts";

export type FieldDef = { key: string; label: string; question: string; numeric?: boolean; group: "Studio" | "Money" | "Event" | "Offer" | "Close" };

export const FIELD_DEFS: FieldDef[] = [
  { key: "ownerName", label: "Owner's name", question: "Confirm who you're speaking with and their role.", group: "Studio" },
  { key: "ownerTitle", label: "Title", question: "What's your role at the studio?", group: "Studio" },
  { key: "studioName", label: "Studio name", question: "Confirm the studio's name.", group: "Studio" },
  { key: "studioType", label: "Discipline", question: "What kinds of classes do you run?", group: "Studio" },
  { key: "neighbourhood", label: "Neighbourhood", question: "Where are you, and who lives around you?", group: "Studio" },
  { key: "audience", label: "Who the members are", question: "Who's your typical member?", group: "Studio" },
  { key: "vibeWords", label: "Three words for the studio", question: "If your members described the studio in three words, what would they say?", group: "Studio" },
  { key: "biggestPain", label: "Biggest challenge", question: "What's the hardest part of the business right now?", group: "Money" },
  { key: "slowPeriod", label: "Slowest period", question: "When is it hardest to sign new members?", group: "Money" },
  { key: "memberCount", label: "Active members", question: "Roughly how many active members do you have?", numeric: true, group: "Money" },
  { key: "monthlyPrice", label: "Monthly price ($)", question: "What does a typical member pay per month?", numeric: true, group: "Money" },
  { key: "avgMonthsStay", label: "Months a member stays", question: "How long does a member usually stay?", numeric: true, group: "Money" },
  { key: "currentIntroOffer", label: "Current intro offer", question: "What intro offer do new people get today?", group: "Money" },
  { key: "marketingSpend", label: "Monthly spend to win members ($)", question: "What do you spend a month on ads or promos to get new members?", numeric: true, group: "Money" },
  { key: "spaceCapacity", label: "Space capacity (people)", question: "How many people can the space hold standing?", numeric: true, group: "Event" },
  { key: "equipment", label: "Equipment / stations", question: "How many bikes / stations / rings do you have? Do they track output?", group: "Event" },
  { key: "eventGoal", label: "What they want from the night", question: "If this night goes perfectly, what happens the week after?", group: "Event" },
  { key: "expectedTurnout", label: "Expected turnout", question: "How many people do you think your members would bring?", numeric: true, group: "Event" },
  { key: "preferredDate", label: "Preferred date", question: "Which dates work? Weeknight or weekend, after hours?", group: "Event" },
  { key: "tonightOffer", label: "Tonight-only offer", question: "What could you offer that's only this good on the night?", group: "Offer" },
  { key: "weekOffer", label: "Days 1–7 offer", question: "And for the week after, a slightly higher price?", group: "Offer" },
  { key: "friendPerk", label: "Bring-a-friend reward", question: "What would you give a member for each friend who joins?", group: "Offer" },
  { key: "decisionMaker", label: "Who signs", question: "Is anyone else involved in the decision?", group: "Close" },
  { key: "objections", label: "Concerns raised", question: "Anything that would stop you from doing this?", group: "Close" },
];

export type FieldValue = { value: string; quote?: string };
export type Fields = Record<string, FieldValue>;

export type LiveConcept = {
  name: string;
  headline: string; // the one-line question/twist
  howItWorks: string;
  world: { look: string; sound: string; rules: string; souvenir: string };
  runOfNight: { time: string; moment: string; what: string }[];
  wowMoments: { title: string; desc: string }[];
  peakMoment: string;
  connection: string;
  story: string;
  basedOn?: string;
};

export const PRICE_TIERS = {
  FOUNDING: { label: "Founding Partner Night (first 3 studios)", price: 3000, payInFull: 2850 },
  STANDARD: { label: "Standard Takeover", price: 4000, payInFull: 3800 },
  QUARTERLY: { label: "Quarterly Partner (per event, 3 events)", price: 3000, payInFull: 2850 },
} as const;
export type PriceTier = keyof typeof PRICE_TIERS;

const GST = 0.05;
const QST = 0.09975;

export function num(fields: Fields, key: string): number | null {
  const raw = fields[key]?.value;
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function val(fields: Fields, key: string, fallback = ""): string {
  return (fields[key]?.value || "").trim() || fallback;
}

const money = (n: number) => "$" + n.toLocaleString("en-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function deckNumbers(fields: Fields, tier: PriceTier) {
  const t = PRICE_TIERS[tier] || PRICE_TIERS.FOUNDING;
  const price = num(fields, "monthlyPrice");
  const months = num(fields, "avgMonthsStay") || 6;
  const capacity = num(fields, "spaceCapacity");
  const expected = num(fields, "expectedTurnout") || (capacity ? Math.min(capacity, 150) : 120);
  const headcount = round5(expected * 0.65); // Full House target: ~65% of expected (Manual 02B)
  const passTarget = Math.max(10, Math.round(expected * 0.13)); // ~10-15% close rate planned
  const members30 = Math.max(5, Math.round(passTarget / 2));
  const memberValue = price ? price * months : null;
  const membersValue = memberValue ? members30 * memberValue : null;
  const roi = membersValue ? membersValue / t.price : null;
  const tax = t.price * (GST + QST);
  const total = t.price + tax;
  const pif = t.payInFull * (1 + GST + QST);
  const tonight = val(fields, "tonightOffer", price ? `3 weeks unlimited for ${money(round5(price * 0.25))}` : "3 weeks unlimited at an intro price");
  const week = val(fields, "weekOffer", "Same offer, shorter pass, days 1–7 only");
  const friend = val(fields, "friendPerk", "1 free week per friend who joins, up to 3");
  return {
    tier: t, price, months, expected, headcount, passTarget, members30, memberValue, membersValue, roi,
    tax, total, pif, split: [total * 0.2, total * 0.4, total * 0.4],
    tonight, week, friend, money,
  };
}

export function transcriptText(segments: { speaker: string; text: string }[], maxChars = 24000): string {
  const lines = segments.map((s) => `${s.speaker === "REP" ? "PROTOCOL" : "MEETING"}: ${s.text}`);
  let out = lines.join("\n");
  if (out.length > maxChars) out = "…\n" + out.slice(out.length - maxChars);
  return out;
}

// ---- Claude ---------------------------------------------------------------

async function callClaude(models: (string | undefined)[], system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY isn't set — add it in Railway (Project → Variables), then redeploy.");
  const list = [...new Set(models.filter(Boolean) as string[])];
  let lastErr = "";
  for (const model of list) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (res.ok) {
      const json = await res.json();
      return (json.content?.[0]?.text as string) || "";
    }
    lastErr = `Claude API error (${res.status}): ${(await res.text()).slice(0, 300)}`;
    // Only fall through to the next model when this one isn't available.
    if (!(res.status === 404 || (res.status === 400 && /model/i.test(lastErr)))) break;
  }
  throw new Error(lastErr || "Claude call failed.");
}

const FAST_MODELS = () => [process.env.LIVE_PROPOSAL_FAST_MODEL, "claude-haiku-5-5", "claude-haiku-4-5", process.env.ANTHROPIC_MODEL, "claude-sonnet-4-5-20250929"];
const SMART_MODELS = () => [process.env.LIVE_PROPOSAL_MODEL, "claude-sonnet-5-5", process.env.ANTHROPIC_MODEL, "claude-sonnet-4-5-20250929"];

function parseJson<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("Claude didn't return JSON.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export async function extractFields(transcript: string, current: Fields, locked: string[]): Promise<Fields> {
  const open = FIELD_DEFS.filter((f) => !locked.includes(f.key));
  if (!open.length || !transcript.trim()) return current;
  const system = `You fill in a discovery form from a live sales-call transcript between PROTOCOL (an events agency that runs one-night "Studio Takeover" events inside fitness studios) and CLIENT (a studio owner). The transcript is machine-transcribed in ~15-second pieces, possibly in French or English, and may contain errors. Lines marked PROTOCOL are the Protocol rep's microphone; lines marked MEETING are the meeting's audio, which is mostly the client but can include Protocol speaking too, so judge who is talking from context.
Rules:
- Only fill a field when the transcript clearly states it. Never guess, never invent numbers.
- Numeric fields: a plain number only (e.g. "125"), no currency symbols or ranges; for a range use the midpoint.
- Keep values short (under 20 words), written in English.
- "quote" is a few words from the transcript that support the value.
- If the transcript changes an earlier answer, return the new value.
Return ONLY JSON: {"fields": {"<key>": {"value": "...", "quote": "..."}}} including only fields you can fill.`;
  const user = `Fields to fill (key: label${""}):\n${open.map((f) => `- ${f.key}: ${f.label}${f.numeric ? " (number)" : ""}`).join("\n")}\n\nCurrent values (may be empty):\n${JSON.stringify(Object.fromEntries(open.map((f) => [f.key, current[f.key]?.value || ""])))}\n\nTranscript:\n${transcript}`;
  const text = await callClaude(FAST_MODELS(), system, user, 1500);
  const parsed = parseJson<{ fields?: Fields }>(text);
  const next: Fields = { ...current };
  for (const [k, v] of Object.entries(parsed.fields || {})) {
    if (locked.includes(k) || !FIELD_DEFS.some((f) => f.key === k)) continue;
    if (v && typeof v.value === "string" && v.value.trim()) next[k] = { value: v.value.trim(), quote: v.quote };
  }
  return next;
}

export async function generateConcepts(transcript: string, fields: Fields): Promise<LiveConcept[]> {
  const system = `You design one-night "Studio Takeover" events for Protocol, a Montreal experiential events agency (sober, high-energy, "Keep moving"). The event is held inside ONE fitness studio, within its real space, capacity and equipment, and is built to sign that studio new members.
Every concept follows the event formula's four fixed beats:
1. The hook: one idea people have never seen at this studio, built around what it does.
2. Take part: guests move, not watch.
3. The offer moment: at the night's peak, the studio presents a tonight-only offer.
4. Capture: designed for the camera; guests get a reason to post.
House taste (very important): the best ideas are a matchup or twist that fits in ONE question anyone can answer ("can 40 riders beat one Olympian?"), with a clear underdog, a visible result at the end, and a headline before it happens. Weird and talked-about beats safe. Never generic party themes (decades night, glow party, silent disco), never anything with alcohol, never a celebrity or partner you'd need to book unless clearly feasible.
Use the concept bank as starting points and adapt to what the client said; you may combine patterns. Make the three concepts genuinely different.
Write in plain, punchy English addressed to the studio owner ("your members"). No em dashes.
Return ONLY JSON: {"concepts": [ {"name": "2-4 word event name", "headline": "the one-line question or twist", "howItWorks": "2-3 sentences", "world": {"look": "...", "sound": "...", "rules": "...", "souvenir": "..."}, "runOfNight": [{"time": "6:00", "moment": "2-4 words", "what": "under 12 words"}] (6-7 rows, evening after studio hours), "wowMoments": [{"title": "2-4 words", "desc": "under 22 words"}] (exactly 6), "peakMoment": "when and how the offer lands", "connection": "trial / movement / surprise and delight", "story": "one sentence: the studio helps its people beat X, and tonight is the payoff", "basedOn": "concept bank name(s)"} ] } with exactly 3 concepts, strongest first.`;
  const known = FIELD_DEFS.filter((f) => fields[f.key]?.value).map((f) => `- ${f.label}: ${fields[f.key].value}`).join("\n") || "(nothing confirmed yet)";
  const user = `Concept bank:\n${CONCEPT_BANK.map((c) => `- ${c.name}: ${c.pattern} (Fits: ${c.fitsBest})`).join("\n")}\n\nWhat we know about the studio:\n${known}\n\nCall transcript so far:\n${transcript || "(empty)"}`;
  const text = await callClaude(SMART_MODELS(), system, user, 4000);
  const parsed = parseJson<{ concepts?: LiveConcept[] }>(text);
  const concepts = (parsed.concepts || []).filter((c) => c && c.name).slice(0, 3);
  if (!concepts.length) throw new Error("Claude returned no concepts.");
  return concepts;
}
