export type LeadType = "CLIENT" | "SPONSOR" | "VENUE";
export type LeadPriority = "HOT" | "WARM" | "COLD";
export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFYING"
  | "PROPOSAL_SENT"
  | "NEGOTIATING"
  | "FOLLOW_UP_SCHEDULED"
  | "WON"
  | "LOST"
  | "ON_HOLD";

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

export const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFYING", label: "Qualifying" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "FOLLOW_UP_SCHEDULED", label: "Follow-up Scheduled" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ON_HOLD", label: "On Hold" },
];

export const STATUS_LABEL: Record<LeadStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
) as Record<LeadStatus, string>;

export const STATUS_STYLE: Record<LeadStatus, string> = {
  NEW: "bg-neutral-100 text-neutral-600",
  CONTACTED: "bg-blue-50 text-blue-700",
  QUALIFYING: "bg-indigo-50 text-indigo-700",
  PROPOSAL_SENT: "bg-purple-50 text-purple-700",
  NEGOTIATING: "bg-amber-50 text-amber-700",
  FOLLOW_UP_SCHEDULED: "bg-cyan-50 text-cyan-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-red-50 text-red-700",
  ON_HOLD: "bg-neutral-100 text-neutral-500",
};

export const PRIORITY_STYLE: Record<LeadPriority, string> = {
  HOT: "bg-red-50 text-red-700",
  WARM: "bg-amber-50 text-amber-700",
  COLD: "bg-blue-50 text-blue-700",
};

export const OPEN_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFYING",
  "PROPOSAL_SENT",
  "NEGOTIATING",
  "FOLLOW_UP_SCHEDULED",
];

export function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}
