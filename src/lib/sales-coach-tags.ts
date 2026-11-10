// Fixed vocabulary for Sales Coach's per-call tags. Deliberately a closed
// list rather than free text: a tag the model invents fresh each time
// ("hesitated on pricing" vs. "wasn't confident on price") would never
// match itself across calls, so nothing could ever be counted as a
// recurring pattern. Picking from this list is what makes "this keeps
// happening" a real, countable thing instead of a vibe.
//
// Shared by the analyze route (sent to Claude + validated against) and
// the Sales Coach UI (labels for chips and the patterns panel).

export type CoachTag = { key: string; label: string };

export const ISSUE_TAGS: CoachTag[] = [
  { key: "weak_discovery", label: "Weak discovery — didn't dig into the lead's real situation" },
  { key: "pitched_too_early", label: "Pitched before earning the right to" },
  { key: "poor_listening", label: "Talked over or didn't really listen to the lead" },
  { key: "price_objection_mishandled", label: "Price objection mishandled" },
  { key: "other_objection_unaddressed", label: "An objection was left unaddressed" },
  { key: "unclear_value_prop", label: "Value proposition wasn't clear" },
  { key: "no_urgency", label: "Didn't create urgency" },
  { key: "no_clear_ask", label: "Didn't ask for the close or next step" },
  { key: "vague_next_step", label: "Next step/follow-up was left vague" },
  { key: "rambled", label: "Rambled or lost control of the conversation" },
  { key: "weak_opening", label: "Weak opening / didn't build rapport" },
  { key: "over_talked", label: "Talked too much relative to the lead" },
  { key: "missed_buying_signal", label: "Missed a buying signal" },
  { key: "low_energy", label: "Low energy / didn't sound confident" },
];

export const STRENGTH_TAGS: CoachTag[] = [
  { key: "strong_discovery", label: "Strong discovery — uncovered the real need" },
  { key: "good_rapport", label: "Built real rapport" },
  { key: "handled_objection_well", label: "Handled an objection well" },
  { key: "clear_value_prop", label: "Value proposition landed clearly" },
  { key: "created_urgency", label: "Created real urgency" },
  { key: "strong_close", label: "Asked for the close confidently" },
  { key: "clear_next_step", label: "Locked in a clear next step" },
  { key: "good_listening", label: "Listened well / let the lead talk" },
  { key: "read_the_room", label: "Read the lead's buying signals well" },
];

export function labelFor(tags: CoachTag[], key: string): string {
  return tags.find((t) => t.key === key)?.label || key;
}

export function isValidTag(tags: CoachTag[], key: string): boolean {
  return tags.some((t) => t.key === key);
}
