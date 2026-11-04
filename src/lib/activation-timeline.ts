// The SOP's 17-step timeline (Protocol B2B SOP v1.3, Section 00/03), used
// to seed ActivationStep rows the moment a deal becomes an Activation.
// `offsetDays` is relative to the event date (T); a negative number is
// "T minus" that many days. When eventDate is still unknown, dueDate is
// left null and can be recomputed later via computeStepDates().

export type TimelineStepTemplate = {
  stepNumber: number;
  title: string;
  owner: string; // "V" | "M" | "V+M" | "Brand"
  offsetDays: number | null; // null = no fixed offset (e.g. "T-8 weeks or earlier")
  doneWhen: string;
};

export const ACTIVATION_TIMELINE_TEMPLATE: TimelineStepTemplate[] = [
  { stepNumber: 1, title: "Outreach & Qualification", owner: "V", offsetDays: -56, doneWhen: "Discovery call booked" },
  { stepNumber: 2, title: "Discovery Call", owner: "V+M", offsetDays: -49, doneWhen: "Cost sheet filled in" },
  { stepNumber: 3, title: "Concept, Proposal & Contract", owner: "M", offsetDays: -21, doneWhen: "Contract signed + 20% deposit received" },
  { stepNumber: 4, title: "Permits, Insurance & Music Licence", owner: "M", offsetDays: -21, doneWhen: "Approvals in hand, insurance certificate sent" },
  { stepNumber: 5, title: "Venue, Route & Vendors", owner: "M", offsetDays: -21, doneWhen: "All vendors confirmed in writing" },
  { stepNumber: 6, title: "Promotion Launch", owner: "V", offsetDays: -21, doneWhen: "RSVP page live, PROTOCOL code tested in brand's system" },
  { stepNumber: 7, title: "Shot List & Run of Show", owner: "V", offsetDays: -14, doneWhen: "Shot list shared with team + brand" },
  { stepNumber: 8, title: "Volunteers & Safety Plan", owner: "V+M", offsetDays: -14, doneWhen: "Roster full, first-aider named" },
  { stepNumber: 9, title: "Second Payment (40%)", owner: "M", offsetDays: -7, doneWhen: "Payment cleared" },
  { stepNumber: 10, title: "Weather Go / No-Go", owner: "V+M", offsetDays: -2, doneWhen: "Decision posted by T-24h" },
  { stepNumber: 11, title: "Equipment Pickup & Test", owner: "M", offsetDays: -1, doneWhen: "Full audio chain tested" },
  { stepNumber: 12, title: "Setup & Final Check", owner: "V+M", offsetDays: 0, doneWhen: "Sound check done, volunteers briefed" },
  { stepNumber: 13, title: "Run the Event", owner: "V+M", offsetDays: 0, doneWhen: "Everyone back at venue, no open incidents" },
  { stepNumber: 14, title: "On-Site Conversion Offer", owner: "Brand", offsetDays: 0, doneWhen: "Offer presented, code in use" },
  { stepNumber: 15, title: "Close the Loop & Content Delivery", owner: "V", offsetDays: 1, doneWhen: "Same-night text sent, next-morning survey out, recap live, photo drive sent" },
  { stepNumber: 16, title: "One-Page Recap, Returns & Final Invoice", owner: "V+M", offsetDays: 3, doneWhen: "Recap sent to brand, gear returned, final invoice issued" },
  { stepNumber: 17, title: "Report & Debrief", owner: "V+M", offsetDays: 5, doneWhen: "Full report delivered, series pitched" },
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
