import type { ModuleKey } from "./permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide-react icon name
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
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/dashboard/content", label: "Trial Reels", icon: "Flame", module: "content" },
      { href: "/dashboard/analytics", label: "Analytics", icon: "BarChart2", module: "analytics" },
      { href: "/dashboard/ads", label: "Ads", icon: "Megaphone", module: "ads" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/dashboard/people", label: "People", icon: "Users", module: "people" },
    ],
  },
  {
    label: "Comms",
    items: [
      { href: "/dashboard/mail", label: "Mail", icon: "Mail", module: "mail" },
      { href: "/dashboard/comms", label: "Comms", icon: "MessageSquare", module: "comms" },
      { href: "/dashboard/recordings", label: "Recordings", icon: "Video", module: "recordings" },
      { href: "/dashboard/copilot", label: "Copilot", icon: "Bot", module: "copilot" },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/dashboard/shoots", label: "Shoot Board", icon: "Kanban", module: "shoots" },
      { href: "/dashboard/lab", label: "Content Lab", icon: "FlaskConical", module: "lab" },
      { href: "/dashboard/ig-automations", label: "IG Automations", icon: "Zap", module: "ig_automations" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/dashboard/calendar", label: "Calendar", icon: "Calendar", module: "calendar" },
      { href: "/dashboard/booking", label: "Booking", icon: "CalendarClock", module: "booking" },
      { href: "/dashboard/docs", label: "Docs & Sign", icon: "FileText", module: "docs" },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/dashboard/training", label: "Training", icon: "Dumbbell", module: "training" },
      { href: "/dashboard/brain", label: "Brain", icon: "Brain", module: "brain" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/automations", label: "Automations", icon: "Workflow", module: "automations" },
      { href: "/dashboard/settings/team", label: "Team", icon: "ShieldCheck", module: "team" },
      { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
    ],
  },
];
