// The 18-step timeline from the Protocol Brand Activation Playbook (Nov
// 2026) — phases A-D (the sell-through-event formula) plus phase E
// (follow-up and the recap), used to seed ActivationStep rows the moment
// a deal becomes an Activation. `offsetDays` is relative to the event
// date (T); a negative number is "T minus" that many days. When
// eventDate is still unknown, dueDate is left null and can be
// recomputed later via computeStepDates().

export type TimelineStepTemplate = {
  stepNumber: number;
  phase: "A" | "B" | "C" | "D" | "E";
  title: string;
  owner: string; // "V" | "M" | "V+M" | "Brand" | "Door team" | "Brand-zone lead"
  offsetDays: number | null;
  doneWhen: string;
};

export const PHASE_LABELS: Record<TimelineStepTemplate["phase"], string> = {
  A: "A · Sell (6-8 weeks out)",
  B: "B · Design (4-6 weeks out)",
  C: "C · Promote & prepare (0-4 weeks out)",
  D: "D · Run the night (event day)",
  E: "E · Follow-up & recap",
};

export const ACTIVATION_TIMELINE_TEMPLATE: TimelineStepTemplate[] = [
  // Phase A - Sell
  { stepNumber: 1, phase: "A", title: "Discovery call (30 min)", owner: "V", offsetDays: -49, doneWhen: "6 discovery questions answered and written into the CRM record" },
  { stepNumber: 2, phase: "A", title: "Pick the conversion goal & the number", owner: "V", offsetDays: -49, doneWhen: "One goal set with a target: attendance x realistic rate" },
  { stepNumber: 3, phase: "A", title: "Write the one-page event brief", owner: "V+M", offsetDays: -45, doneWhen: "Every line filled: goal, format, connection type, what attendees pay, story sentence, brand personality, peak moment, deliverables, price + deposit" },
  { stepNumber: 4, phase: "A", title: "Pitch, sign, collect deposit", owner: "M", offsetDays: -42, doneWhen: "Signed agreement + 50% deposit received, deal moved to Booked" },
  // Phase B - Design
  { stepNumber: 5, phase: "B", title: "Build the run of show", owner: "V+M", offsetDays: -35, doneWhen: "Minute-by-minute timeline done, peak brand moment block scheduled" },
  { stepNumber: 6, phase: "B", title: "Design the entrance & the space", owner: "M", offsetDays: -32, doneWhen: "One filmable 'wow' visual placed, walking path mapped, lighting/sound cues set per transition" },
  { stepNumber: 7, phase: "B", title: "Script the peak brand moment", owner: "V", offsetDays: -30, doneWhen: "5-line cue/action/release script shared with DJ, host and staff" },
  { stepNumber: 8, phase: "B", title: "Set the sharing trigger & RSVP page", owner: "V", offsetDays: -28, doneWhen: "One STEPPS trigger chosen, RSVP page live, shot list written with the brand" },
  // Phase C - Promote & prepare
  { stepNumber: 9, phase: "C", title: "Run the promotion calendar", owner: "V", offsetDays: -28, doneWhen: "Announcement + collab post live, RSVP link out; teaser, reminder and reveal posts scheduled through day -1" },
  { stepNumber: 10, phase: "C", title: "Brief the team", owner: "M", offsetDays: -2, doneWhen: "15-minute briefing done: story sentence, 3 product facts, the offer, who does what" },
  { stepNumber: 11, phase: "C", title: "Prepare the kit", owner: "M", offsetDays: -1, doneWhen: "Product quantities = attendance x 1.2, QR check-in, consent forms, photo wall, first-aid kit and batteries packed" },
  // Phase D - Run the night
  { stepNumber: 12, phase: "D", title: "Check in every person", owner: "Door team", offsetDays: 0, doneWhen: "Every attendee scanned via QR, walk-ins hand-counted" },
  { stepNumber: 13, phase: "D", title: "Deliver the peak brand moment", owner: "V+DJ", offsetDays: 0, doneWhen: "Step 7 script run, filming person captured the crowd's reaction" },
  { stepNumber: 14, phase: "D", title: "Tally while it happens", owner: "Brand-zone lead", offsetDays: 0, doneWhen: "Trials/samples, offer-code redemptions and zone sign-ups counted live, not guessed afterward" },
  // Phase E - Follow-up & recap
  { stepNumber: 15, phase: "E", title: "Send Day-0 proof clips", owner: "V", offsetDays: 0, doneWhen: "3 raw clips sent to the brand contact before you sleep" },
  { stepNumber: 16, phase: "E", title: "Deliver first content", owner: "V", offsetDays: 2, doneWhen: "First Reels + photos delivered" },
  { stepNumber: 17, phase: "E", title: "Send the recap report", owner: "V+M", offsetDays: 3, doneWhen: "7-block recap PDF sent with a 3-line email and two meeting time slots" },
  { stepNumber: 18, phase: "E", title: "Recap meeting & rebooking offer", owner: "V+M", offsetDays: 6, doneWhen: "30-minute meeting held, 3 rebooking options (one more event / 3-event series / monthly retainer) offered before the call ends" },
];

export function computeStepDates(eventDate: Date | null): Map<number, Date | null> {
  const out = new Map<number, Date | null>();
  for (const s of ACTIVATION_TIMELINE_TEMPLATE) {
    if (!eventDate || s.offsetDays === null) {
      out.set(s.stepNumber, null);
      continue;
    }
    const d = new Date(eventDate);
    d.setDate(d.getDate() + s.offsetDays);
    out.set(s.stepNumber, d);
  }
  return out;
}
