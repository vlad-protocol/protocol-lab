// Fixed vocabulary for Sales Coach's per-call tags. Deliberately a closed
// list rather than free text: a tag the model invents fresh each time
// ("hesitated on pricing" vs. "wasn't confident on price") would never
// match itself across calls, so nothing could ever be counted as a
// recurring pattern. Picking from this list is what makes "this keeps
// happening" a real, countable thing instead of a vibe.
//
// Split by call kind because a cold call and a discovery/video call have
// different goals (per the Protocol Sales Playbook: a cold call's only
// job is to get the video call booked; a video call's job is to close)
// and so get coached against different things — "didn't ask for the
// close" is a real issue on a video call and meaningless on a cold call,
// which should never be asking for a close at all.
//
// Shared by the analyze route (sent to Claude + validated against) and
// the Sales Coach UI (labels for chips and the patterns panel).

export type CoachTag = { key: string; label: string };
export type CallKind = "CALL" | "VIDEO_CALL";

// Cold call (phone): goal is booking the video call, not closing.
export const COLD_CALL_ISSUE_TAGS: CoachTag[] = [
  { key: "weak_opening", label: "Weak opening / didn't build rapport" },
  { key: "lost_to_gatekeeper", label: "Didn't get past the gatekeeper" },
  { key: "pitched_too_long", label: "Over-pitched instead of staying brief" },
  { key: "no_intrigue", label: "Didn't create enough intrigue to book" },
  { key: "price_objection_mishandled", label: "Price objection mishandled" },
  { key: "other_objection_unaddressed", label: "An objection was left unaddressed" },
  { key: "asked_to_close_not_book", label: "Tried to close on the call instead of booking the video call" },
  { key: "no_clear_ask_to_book", label: "Didn't clearly ask for the video call" },
  { key: "vague_booking", label: "Got a soft yes but no firm date/time booked" },
  { key: "rambled", label: "Rambled or lost control of the conversation" },
  { key: "over_talked", label: "Talked too much relative to the lead" },
  { key: "missed_buying_signal", label: "Missed a buying signal" },
  { key: "low_energy", label: "Low energy / didn't sound confident" },
  { key: "poor_listening", label: "Talked over or didn't really listen to the lead" },
];

export const COLD_CALL_STRENGTH_TAGS: CoachTag[] = [
  { key: "strong_opening", label: "Strong opening / built rapport fast" },
  { key: "got_past_gatekeeper", label: "Got past the gatekeeper smoothly" },
  { key: "kept_it_brief", label: "Stayed brief — didn't over-pitch on the cold call" },
  { key: "created_intrigue", label: "Created real intrigue / curiosity" },
  { key: "handled_objection_well", label: "Handled an objection well" },
  { key: "firm_booking", label: "Locked in a firm date/time for the video call" },
  { key: "good_listening", label: "Listened well / let the lead talk" },
  { key: "read_the_room", label: "Read the lead's buying signals well" },
];

// Discovery / video call (Zoom): goal is closing the deal.
export const DISCOVERY_ISSUE_TAGS: CoachTag[] = [
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

export const DISCOVERY_STRENGTH_TAGS: CoachTag[] = [
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

export function issueTagsFor(kind: CallKind): CoachTag[] {
  return kind === "CALL" ? COLD_CALL_ISSUE_TAGS : DISCOVERY_ISSUE_TAGS;
}
export function strengthTagsFor(kind: CallKind): CoachTag[] {
  return kind === "CALL" ? COLD_CALL_STRENGTH_TAGS : DISCOVERY_STRENGTH_TAGS;
}

// Union of both — only used where something needs to look up a label
// without knowing (or caring about) which call kind it came from, e.g.
// rendering a tag chip that's already stored on a call.
export const ISSUE_TAGS: CoachTag[] = [
  ...COLD_CALL_ISSUE_TAGS,
  ...DISCOVERY_ISSUE_TAGS.filter((t) => !COLD_CALL_ISSUE_TAGS.some((c) => c.key === t.key)),
];
export const STRENGTH_TAGS: CoachTag[] = [
  ...COLD_CALL_STRENGTH_TAGS,
  ...DISCOVERY_STRENGTH_TAGS.filter((t) => !COLD_CALL_STRENGTH_TAGS.some((c) => c.key === t.key)),
];

export function labelFor(tags: CoachTag[], key: string): string {
  return tags.find((t) => t.key === key)?.label || key;
}

export function isValidTag(tags: CoachTag[], key: string): boolean {
  return tags.some((t) => t.key === key);
}
