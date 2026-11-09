import type { ModuleKey } from "./permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide-react icon name
  // Key into the sidebar's icon-chip gradient palette (see
  // ICON_CHIP_COLORS in sidebar.tsx) — purely cosmetic, a Ripping-style
  // colorful square behind the icon instead of a flat single-tone one.
  color?: string;
  module?: ModuleKey; // undefined = always visible (dashboard home, settings)
  phase?: number; // undefined = live now
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Performance",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", color: "slate" },
      { href: "/dashboard/content", label: "Trial Reels", icon: "Flame", module: "content", color: "orange" },
      { href: "/dashboard/analytics", label: "Analytics", icon: "BarChart2", module: "analytics", color: "blue" },
      { href: "/dashboard/performance", label: "Content Performance", icon: "TrendingUp", module: "content_performance", color: "green" },
      { href: "/dashboard/content-engine", label: "Content Engine", icon: "Sparkles", module: "content_engine", color: "purple" },
      { href: "/dashboard/ads", label: "Ads", icon: "Megaphone", module: "ads", color: "amber" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/dashboard/protocol-crm", label: "Protocol CRM", icon: "Handshake", module: "protocol_crm", color: "indigo" },
      { href: "/dashboard/activations", label: "Activations", icon: "Rocket", module: "activations", color: "orange" },
      { href: "/dashboard/sequences", label: "Follow-up Sequences", icon: "Repeat", module: "sequences", color: "teal" },
      { href: "/dashboard/automation-confirmations", label: "Automation Confirmations", icon: "ClipboardCheck", module: "sequences", color: "cyan" },
      { href: "/dashboard/campaigns", label: "Campaigns", icon: "Radio", module: "campaigns", color: "pink" },
      { href: "/dashboard/protocol-list", label: "Protocol List", icon: "Users", module: "protocol_list", color: "slate" },
    ],
  },
  {
    label: "Comms",
    items: [
      { href: "/dashboard/mail", label: "Mail", icon: "Mail", module: "mail", color: "blue" },
      { href: "/dashboard/comms", label: "Comms", icon: "MessageSquare", module: "comms", color: "green" },
      { href: "/dashboard/recordings", label: "Recordings", icon: "Video", module: "recordings", color: "red" },
      { href: "/dashboard/copilot", label: "Copilot", icon: "Bot", module: "copilot", color: "violet" },
      { href: "/dashboard/sales-coach", label: "Sales Coach", icon: "GraduationCap", module: "sales_coach", color: "amber" },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/dashboard/shoots", label: "Shoot Board", icon: "Kanban", module: "shoots", color: "amber" },
      { href: "/dashboard/lab", label: "Content Lab", icon: "FlaskConical", module: "lab", color: "cyan" },
      { href: "/dashboard/ig-automations", label: "IG Automations", icon: "Zap", module: "ig_automations", color: "instagram" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/dashboard/calendar", label: "Calendar", icon: "Calendar", module: "calendar", color: "blue" },
      { href: "/dashboard/booking", label: "Booking", icon: "CalendarClock", module: "booking", color: "teal" },
      { href: "/dashboard/docs", label: "Docs & Sign", icon: "FileText", module: "docs", color: "slate" },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/dashboard/training", label: "Training", icon: "Dumbbell", module: "training", color: "red" },
      { href: "/dashboard/brain", label: "Brain", icon: "Brain", module: "brain", color: "purple" },
      { href: "/dashboard/cfo", label: "CFO", icon: "PiggyBank", module: "cfo", color: "green" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/automations", label: "Automations", icon: "Workflow", module: "automations", color: "slate" },
      { href: "/dashboard/settings/team", label: "Team", icon: "ShieldCheck", module: "team", color: "blue" },
      { href: "/dashboard/settings", label: "Settings", icon: "Settings", color: "slate" },
    ],
  },
];
