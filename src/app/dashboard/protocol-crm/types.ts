export type LeadType = "CLIENT" | "SPONSOR" | "VENUE";
export type LeadPriority = "HOT" | "WARM" | "COLD";
export type LeadStatus =
  | "NEW_LEAD"
  | "CONTACTED_ONCE"
  | "FOLLOW_UP_1"
  | "FOLLOW_UP_2"
  | "FOLLOW_UP_LAST"
  | "STALE"
  | "MEETING_BOOKED"
  | "NEGOTIATING"
  | "WON"
  | "LOST";

export type Lead = {
  id: string;
  number: number;
  companyName: string | null;
  contactName: string;
  type: LeadType;
  industry: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  assignedRep: string | null;
  priority: LeadPriority | null;
  status: LeadStatus;
  dateFirstContacted: string | null;
  lastContactDate: string | null;
  totalTouches: number;
  lastConversationSummary: string | null;
  nextStep: string | null;
  nextFollowUpDate: string | null;
  followUpOwner: string | null;
  eventOpportunity: string | null;
  dealValue: number | null;
  notes: string | null;
};

export const TYPE_OPTIONS: { value: LeadType; label: string }[] = [
  { value: "CLIENT", label: "Client" },
  { value: "SPONSOR", label: "Sponsor" },
  { value: "VENUE", label: "Venue" },
];

export const TYPE_STYLE: Record<LeadType, string> = {
  CLIENT: "bg-emerald-50 text-emerald-700",
  SPONSOR: "bg-violet-50 text-violet-700",
  VENUE: "bg-blue-50 text-blue-700",
};

// Board-column order — this is also the Kanban view's left-to-right order.
export const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "CONTACTED_ONCE", label: "Contacted Once" },
  { value: "FOLLOW_UP_1", label: "1st Follow Up" },
  { value: "FOLLOW_UP_2", label: "Second Follow Up" },
  { value: "FOLLOW_UP_LAST", label: "Last Follow Up" },
  { value: "STALE", label: "Stale" },
  { value: "MEETING_BOOKED", label: "1st Meeting Booked" },
  { value: "NEGOTIATING", label: "Negotiations" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export const STATUS_LABEL: Record<LeadStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
) as Record<LeadStatus, string>;

export const STATUS_STYLE: Record<LeadStatus, string> = {
  NEW_LEAD: "bg-neutral-100 text-neutral-600",
  CONTACTED_ONCE: "bg-blue-50 text-blue-700",
  FOLLOW_UP_1: "bg-indigo-50 text-indigo-700",
  FOLLOW_UP_2: "bg-purple-50 text-purple-700",
  FOLLOW_UP_LAST: "bg-fuchsia-50 text-fuchsia-700",
  STALE: "bg-neutral-100 text-neutral-500",
  MEETING_BOOKED: "bg-cyan-50 text-cyan-700",
  NEGOTIATING: "bg-amber-50 text-amber-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-red-50 text-red-700",
};

// The column-top accent bar color in the Kanban board (matches STATUS_STYLE
// but as a solid bar color rather than a chip background).
export const STATUS_BAR: Record<LeadStatus, string> = {
  NEW_LEAD: "bg-neutral-400",
  CONTACTED_ONCE: "bg-blue-500",
  FOLLOW_UP_1: "bg-indigo-500",
  FOLLOW_UP_2: "bg-purple-500",
  FOLLOW_UP_LAST: "bg-fuchsia-500",
  STALE: "bg-neutral-400",
  MEETING_BOOKED: "bg-cyan-500",
  NEGOTIATING: "bg-amber-500",
  WON: "bg-emerald-500",
  LOST: "bg-red-500",
};

export const PRIORITY_STYLE: Record<LeadPriority, string> = {
  HOT: "bg-red-50 text-red-700",
  WARM: "bg-amber-50 text-amber-700",
  COLD: "bg-blue-50 text-blue-700",
};

export const OPEN_STATUSES: LeadStatus[] = [
  "NEW_LEAD",
  "CONTACTED_ONCE",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
  "FOLLOW_UP_LAST",
  "STALE",
  "MEETING_BOOKED",
  "NEGOTIATING",
];

export function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}
