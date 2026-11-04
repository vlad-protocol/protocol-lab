// The 10 Activation Rules gate (Protocol B2B SOP v1.3, Section R). Gate 1
// (rules 1-4) must be answered before the proposal goes out (SOP step 3);
// gate 2 (rules 5-10) must be answered before the team brief (step 7). A
// rule "passes" simply by having a non-empty written answer — the SOP
// treats these as sentences to write down, not booleans to tick.

export type ActivationRuleField =
  | "rule1Goal"
  | "rule2Connection"
  | "rule3Currency"
  | "rule4Story"
  | "rule5StartEarly"
  | "rule6GrandEntrance"
  | "rule7Journey"
  | "rule8PeakMoment"
  | "rule9Trigger"
  | "rule10CloseLoop";

export const GATE_1_FIELDS: ActivationRuleField[] = ["rule1Goal", "rule2Connection", "rule3Currency", "rule4Story"];
export const GATE_2_FIELDS: ActivationRuleField[] = [
  "rule5StartEarly",
  "rule6GrandEntrance",
  "rule7Journey",
  "rule8PeakMoment",
  "rule9Trigger",
  "rule10CloseLoop",
];

export const ACTIVATION_RULES: { field: ActivationRuleField; number: number; label: string; passesWhen: string; gate: 1 | 2 }[] = [
  { field: "rule1Goal", number: 1, label: "One conversion goal", passesWhen: "One action and one number, plus the 3-5 metrics that prove it.", gate: 1 },
  { field: "rule2Connection", number: 2, label: "Connection type", passesWhen: "Trial, movement, or surprise and delight (one or two of these).", gate: 1 },
  { field: "rule3Currency", number: 3, label: "Currency", passesWhen: "What attendees \"pay\" instead of money (opt-in, story tag, trying the product).", gate: 1 },
  { field: "rule4Story", number: 4, label: "The story", passesWhen: "One sentence: the brand helps the crowd beat X, plus three personality words.", gate: 1 },
  { field: "rule5StartEarly", number: 5, label: "Start early", passesWhen: "Teaser, waitlist/limited spots, a reveal 48h out, two pre-event messages.", gate: 2 },
  { field: "rule6GrandEntrance", number: 6, label: "Grand entrance", passesWhen: "One photographable \"wow\" at check-in, lighting and sound set.", gate: 2 },
  { field: "rule7Journey", number: 7, label: "The journey", passesWhen: "High control for the workout, low control for the party, both marked in the run of show.", gate: 2 },
  { field: "rule8PeakMoment", number: 8, label: "Peak moment = brand moment", passesWhen: "The trial/reveal/drop timed to the workout-to-party transition, named with its time.", gate: 2 },
  { field: "rule9Trigger", number: 9, label: "Exponential trigger", passesWhen: "One thing that makes people pass it on (photo wall, leaderboard, wearable).", gate: 2 },
  { field: "rule10CloseLoop", number: 10, label: "Close the loop that night", passesWhen: "Same-night text, next-morning survey, one-page recap within 72h.", gate: 2 },
];

export function gatePasses(fields: ActivationRuleField[], record: Record<string, unknown>): boolean {
  return fields.every((f) => typeof record[f] === "string" && record[f].toString().trim().length > 0);
}

export function gate1Passes(record: Record<string, unknown>): boolean {
  return gatePasses(GATE_1_FIELDS, record);
}

export function gate2Passes(record: Record<string, unknown>): boolean {
  return gatePasses(GATE_2_FIELDS, record);
}
