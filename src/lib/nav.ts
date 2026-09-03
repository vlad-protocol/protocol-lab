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
      { href: "/dashboard/ads", label: "Ads", icon: "Megaphone", phase: 7 },
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
      { href: "/dashboard/recordings", label: "Recordings", icon: "Video", phase: 6 },
      { href: "/dashboard/copilot", label: "Copilot", icon: "Bot", phase: 6 },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/dashboard/queue", label: "Queue", icon: "ListChecks", phase: 6 },
      { href: "/dashboard/editor", label: "Editor", icon: "Edit3", phase: 6 },
      { href: "/dashboard/ig-automations", label: "IG Automations", icon: "Zap", phase: 7 },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/dashboard/calendar", label: "Calendar", icon: "Calendar", phase: 6 },
      { href: "/dashboard/booking", label: "Booking", icon: "CalendarClock", phase: 6 },
      { href: "/dashboard/docs", label: "Docs", icon: "FileText", phase: 5 },
      { href: "/dashboard/sign", label: "Sign", icon: "PenTool", phase: 5 },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/dashboard/training", label: "Training", icon: "Dumbbell", module: "training" },
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
