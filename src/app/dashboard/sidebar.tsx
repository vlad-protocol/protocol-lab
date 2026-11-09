"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { canAccess, type ModuleKey } from "@/lib/permissions";

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    name
  ];
  if (!Cmp) return null;
  return <Cmp className={className} />;
}

// Ripping-style colorful icon chips — a small rounded-square gradient
// behind each nav icon instead of one flat sidebar-text-colored glyph.
// "instagram" gets the actual Instagram gradient; everything else is a
// vivid two-stop gradient in that color family.
const ICON_CHIP_COLORS: Record<string, string> = {
  slate: "linear-gradient(135deg, #52525b, #3f3f46)",
  orange: "linear-gradient(135deg, #fb923c, #ea580c)",
  amber: "linear-gradient(135deg, #fbbf24, #d97706)",
  blue: "linear-gradient(135deg, #60a5fa, #2563eb)",
  green: "linear-gradient(135deg, #4ade80, #16a34a)",
  teal: "linear-gradient(135deg, #2dd4bf, #0d9488)",
  cyan: "linear-gradient(135deg, #22d3ee, #0891b2)",
  purple: "linear-gradient(135deg, #c084fc, #9333ea)",
  violet: "linear-gradient(135deg, #a78bfa, #7c3aed)",
  indigo: "linear-gradient(135deg, #818cf8, #4f46e5)",
  pink: "linear-gradient(135deg, #f472b6, #db2777)",
  red: "linear-gradient(135deg, #f87171, #dc2626)",
  instagram: "linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)",
};

function IconChip({ name, color }: { name: string; color?: string }) {
  return (
    <span className="hq-icon-chip" style={{ background: ICON_CHIP_COLORS[color || "slate"] }}>
      <Icon name={name} />
    </span>
  );
}

export function Sidebar({
  userLabel,
  handle,
  followerLabel,
  role,
  permissions,
  badges,
  signOutAction,
}: {
  userLabel: string;
  handle: string;
  followerLabel: string | null;
  role: "OWNER" | "EMPLOYEE";
  permissions: string[];
  badges?: Record<string, number>;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[var(--hq-sidebar)] text-[var(--hq-sidebar-text)]">
      <div className="flex items-center gap-2 border-b border-[var(--hq-sidebar-border)] px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
          <Icons.Sparkle className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="hq-gradient-text truncate text-sm font-semibold tracking-wide">Protocol Lab</p>
          <p className="truncate text-xs text-[var(--hq-sidebar-text-dim)]">{handle}</p>
        </div>
        {role === "EMPLOYEE" && (
          <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase text-[var(--hq-sidebar-text-dim)]">
            Team
          </span>
        )}
      </div>
      {followerLabel && (
        <div className="border-b border-[var(--hq-sidebar-border)] px-4 py-2 text-xs text-[var(--hq-sidebar-text-dim)]">
          {followerLabel}
        </div>
      )}

      <div className="border-b border-[var(--hq-sidebar-border)] px-3 py-3">
        <div className="flex items-center gap-2 rounded-md border border-[var(--hq-sidebar-border)] bg-white/5 px-2.5 py-1.5 text-sm text-[var(--hq-sidebar-text-dim)]">
          <Icons.Search className="h-3.5 w-3.5" />
          <span className="flex-1">Search...</span>
          <kbd className="rounded border border-[var(--hq-sidebar-border)] px-1 text-[10px]">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="border-b border-[var(--hq-sidebar-border)] px-3 py-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-sidebar-text-dim)]">
          Workspace
        </p>
        <div className="flex items-center gap-2 rounded-md bg-[var(--hq-sidebar-active)] px-2.5 py-1.5 text-sm font-medium text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          {userLabel}
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => {
          // Hide a whole group if every item in it is off-limits to this user.
          const visibleItems = group.items.filter(
            (item) => !item.module || canAccess({ role, permissions }, item.module as ModuleKey)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-sidebar-text-dim)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href;
                  const disabled = !!item.phase;
                  const badgeCount = badges?.[item.href] ?? 0;
                  return (
                    <Link
                      key={item.href}
                      href={disabled ? "#" : item.href}
                      aria-disabled={disabled}
                      className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-[var(--hq-sidebar-active)] text-white font-medium"
                          : disabled
                          ? "text-[var(--hq-sidebar-text-dim)] cursor-default"
                          : "text-[var(--hq-sidebar-text)] hover:bg-[var(--hq-sidebar-hover)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <IconChip name={item.icon} color={item.color} />
                        {item.label}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {badgeCount > 0 && (
                          <span
                            title={`${badgeCount} need${badgeCount === 1 ? "s" : ""} your attention`}
                            className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
                          >
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                        {item.phase && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-[var(--hq-sidebar-text-dim)]">
                            Phase {item.phase}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <form action={signOutAction} className="border-t border-[var(--hq-sidebar-border)] p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-[var(--hq-sidebar-text-dim)] hover:bg-[var(--hq-sidebar-hover)]">
          <Icons.LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
