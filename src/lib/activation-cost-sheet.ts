// Ports the Protocol B2B SOP's fill-in cost-sheet calculator (v1.3,
// Section 01) into a real feature: totals are computed server-side from
// saved line items, never trusted from the client, and the 20/40/40
// payment schedule is generated straight from the total.

export type PackageTier = "BRONZE" | "SILVER" | "GOLD";
const TIER_RANK: Record<PackageTier, number> = { BRONZE: 0, SILVER: 1, GOLD: 2 };

export type CostLineItem = {
  group: string; // e.g. "A1 · Audio & Equipment"
  label: string;
  qty: number;
  unitCost: number;
  minTier?: PackageTier; // item only counts at this tier or above
  passThrough?: boolean; // Group B — billed at cost, never multiplied
};

// Same catalogue as the SOP artifact's calculator (Section 01), so a line
// item's label matches what's in the manual.
export const COST_SHEET_CATALOGUE: CostLineItem[] = [
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "Outdoor speaker (bike-mounted)", qty: 0, unitCost: 0 },
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "DJ board / controller", qty: 0, unitCost: 0 },
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "Indoor sound system", qty: 0, unitCost: 0 },
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "Cables & connectors", qty: 0, unitCost: 0 },
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "Lighting rig", qty: 0, unitCost: 0 },
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "Power source / large powerbank", qty: 0, unitCost: 0 },
  { group: "A1 · Audio & Equipment (Concept DEL)", label: "Delivery / pickup fee", qty: 0, unitCost: 0 },
  { group: "A2 · Transport", label: "Cargo bike rental (Allo Velo)", qty: 0, unitCost: 0 },
  { group: "A2 · Transport", label: "Cargo bike trolley / rack", qty: 0, unitCost: 0 },
  { group: "A3 · Labour & Talent", label: "DJ — bike (outdoor)", qty: 0, unitCost: 0 },
  { group: "A3 · Labour & Talent", label: "DJ — venue (after-party)", qty: 0, unitCost: 0 },
  { group: "A3 · Labour & Talent", label: "Cargo bike rider", qty: 0, unitCost: 0 },
  { group: "A3 · Labour & Talent", label: "First-aider (certified)", qty: 0, unitCost: 0 },
  { group: "A3 · Labour & Talent", label: "Volunteer meals / perks", qty: 0, unitCost: 0 },
  { group: "A3 · Labour & Talent", label: "Videographer (camera + lights)", qty: 0, unitCost: 0, minTier: "SILVER" },
  { group: "A3 · Labour & Talent", label: "Lighting tech / assistant", qty: 0, unitCost: 0, minTier: "SILVER" },
  { group: "A4 · Logistics, Safety & Licences", label: "Overnight equipment storage", qty: 0, unitCost: 0 },
  { group: "A4 · Logistics, Safety & Licences", label: "RSVP platform fee", qty: 0, unitCost: 0 },
  { group: "A4 · Logistics, Safety & Licences", label: "Waiver & consent platform", qty: 0, unitCost: 0 },
  { group: "A4 · Logistics, Safety & Licences", label: "Printing (FR first, EN alongside)", qty: 0, unitCost: 0 },
  { group: "A4 · Logistics, Safety & Licences", label: "Event insurance (share or rider)", qty: 0, unitCost: 0 },
  { group: "A4 · Logistics, Safety & Licences", label: "Music licence (SOCAN / Re:Sound)", qty: 0, unitCost: 0 },
  { group: "A4 · Logistics, Safety & Licences", label: "First-aid kit, vests, radios", qty: 0, unitCost: 0 },
  { group: "A5 · Content Production", label: "Editing time — recap reel", qty: 0, unitCost: 0 },
  { group: "A5 · Content Production", label: "Photo editing — stills / drive", qty: 0, unitCost: 0 },
  { group: "A5 · Content Production", label: "Camera rental", qty: 0, unitCost: 0, minTier: "SILVER" },
  { group: "A5 · Content Production", label: "Lighting kit rental", qty: 0, unitCost: 0, minTier: "SILVER" },
  { group: "A5 · Content Production", label: "Editing time — extra vertical clips", qty: 0, unitCost: 0, minTier: "SILVER" },
  { group: "A5 · Content Production", label: "Post-event report (V/M time)", qty: 0, unitCost: 0 },
  { group: "B · Pass-Through (billed at cost, never multiplied)", label: "Venue rental (if Protocol sources it)", qty: 0, unitCost: 0, passThrough: true },
  { group: "B · Pass-Through (billed at cost, never multiplied)", label: "City permit(s)", qty: 0, unitCost: 0, passThrough: true },
];

const QST_GST_RATE = 0.14975; // GST 5% + QST 9.975%
const CONTINGENCY = 1.1; // 10% contingency on Group A

export function calcActivationTotals(lineItems: CostLineItem[], tier: PackageTier, multiplier: number) {
  const tierRank = TIER_RANK[tier];
  const m = Math.min(10, Math.max(5, multiplier || 5));

  let a = 0;
  let b = 0;
  for (const item of lineItems) {
    if (item.minTier && TIER_RANK[item.minTier] > tierRank) continue;
    const sub = (item.qty || 0) * (item.unitCost || 0);
    if (item.passThrough) b += sub;
    else a += sub;
  }
  a *= CONTINGENCY;

  const am = a * m;
  const quotePreTax = am + b;
  const quoteTax = quotePreTax * QST_GST_RATE;
  const quoteTotal = quotePreTax + quoteTax;

  return { costBaseA: round2(a), costPassThroughB: round2(b), quotePreTax: round2(quotePreTax), quoteTax: round2(quoteTax), quoteTotal: round2(quoteTotal) };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// SOP Section 02/06: 20% on signing, 40% at T-7 days, 40% within 72h of
// content delivery. contractSignedDate/eventDate may be null if not yet
// known — the payment row is still created, just without a dueDate.
export function buildPaymentSchedule(total: number, contractSignedDate: Date | null, eventDate: Date | null) {
  const t7 = eventDate ? addDays(eventDate, -7) : null;
  const plus3 = eventDate ? addDays(eventDate, 3) : null;
  return [
    { label: "Deposit (20%, on signing)", amount: round2(total * 0.2), dueDate: contractSignedDate },
    { label: "Second payment (40%, T-7 days)", amount: round2(total * 0.4), dueDate: t7 },
    { label: "Final payment (40%, within 72h of delivery)", amount: round2(total * 0.4), dueDate: plus3 },
  ];
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
