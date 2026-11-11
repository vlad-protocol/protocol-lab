"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Bell, X } from "lucide-react";

// Quick-pick offsets for "remind me to follow up with this lead" — set
// right after a call (e.g. "talked to the gatekeeper, call back
// tomorrow") instead of having to go to the leads list/board to set a
// date. All times are set to 9am local so "today" reminders don't land
// in the past the moment they're set.
const QUICK_OPTIONS = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
];

function atNineAm(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(9, 0, 0, 0);
  return d;
}

function fmtDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function reminderFlag(iso: string | null): { label: string; className: string } | null {
  if (!iso) return null;
  const target = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: "bg-red-100 text-red-700" };
  if (days === 0) return { label: "Due today", className: "bg-orange-100 text-orange-700" };
  if (days <= 7) return { label: `Due in ${days}d`, className: "bg-amber-100 text-amber-700" };
  return {
    label: `Follow up ${target.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    className: "bg-[var(--hq-accent-soft)] text-[var(--hq-accent)]",
  };
}

export function LeadSummaryPanel({
  contactId,
  summary,
  nextStep,
  nextFollowUpDate,
  generatedAt,
  stale,
  hasEmailHistory,
}: {
  contactId: string;
  summary: string | null;
  nextStep: string | null;
  nextFollowUpDate: string | null;
  generatedAt: string | null;
  stale: boolean;
  hasEmailHistory: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reminderDate, setReminderDate] = useState(nextFollowUpDate);
  const [reminderNote, setReminderNote] = useState(nextStep || "");
  const [savingReminder, setSavingReminder] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/contacts/${contactId}/summarize`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error || "Failed to generate a summary.");
      return;
    }
    router.refresh();
  }

  async function patchReminder(data: { nextFollowUpDate?: string | null; nextStep?: string | null }) {
    setSavingReminder(true);
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSavingReminder(false);
    router.refresh();
  }

  function setQuickReminder(days: number) {
    const iso = atNineAm(days).toISOString();
    setReminderDate(iso);
    patchReminder({ nextFollowUpDate: iso });
  }

  function setCustomReminder(dateValue: string) {
    const iso = dateValue ? new Date(`${dateValue}T09:00:00`).toISOString() : null;
    setReminderDate(iso);
    patchReminder({ nextFollowUpDate: iso });
  }

  function clearReminder() {
    setReminderDate(null);
    patchReminder({ nextFollowUpDate: null });
  }

  function commitNote() {
    if (reminderNote === (nextStep || "")) return;
    patchReminder({ nextStep: reminderNote || null });
  }

  const flag = reminderFlag(reminderDate);

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--hq-text)]">
            <Bell className="h-4 w-4 text-[var(--hq-accent)]" /> Follow-up reminder
          </p>
          {flag && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${flag.className}`}>{flag.label}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {QUICK_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setQuickReminder(o.days)}
              disabled={savingReminder}
              className="rounded-full border border-[var(--hq-card-border)] px-3 py-1 text-xs font-medium text-[var(--hq-text)] hover:border-[var(--hq-accent)] disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
          <input
            type="date"
            value={fmtDateInput(reminderDate)}
            onChange={(e) => setCustomReminder(e.target.value)}
            disabled={savingReminder}
            className="rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-xs"
          />
          {reminderDate && (
            <button
              onClick={clearReminder}
              disabled={savingReminder}
              title="Clear reminder"
              className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-red-600"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        <input
          type="text"
          value={reminderNote}
          onChange={(e) => setReminderNote(e.target.value)}
          onBlur={commitNote}
          placeholder="What to do — e.g. &quot;call back, ask for the owner directly&quot;"
          className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
        />

        <p className="mt-2 text-[11px] text-[var(--hq-text-muted)]">
          Shows up as a badge on this lead in the Protocol CRM list/board, and counts toward the red
          number on the Protocol CRM sidebar link once it&apos;s due.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--hq-text)]">
            <Sparkles className="h-4 w-4 text-[var(--hq-accent)]" /> AI conversation summary
          </p>
          <button
            onClick={generate}
            disabled={loading || !hasEmailHistory}
            title={!hasEmailHistory ? "No email history yet to summarize" : undefined}
            className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] px-3 py-1 text-xs font-medium text-[var(--hq-text)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {summary ? "Refresh" : "Generate"}
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {!summary && !error && (
          <p className="mt-2 text-sm text-[var(--hq-text-muted)]">
            {hasEmailHistory
              ? "No summary yet — generate one from the email history with this lead."
              : "Once there's some email back-and-forth with this lead, generate a summary here."}
          </p>
        )}

        {summary && (
          <div className="mt-2 space-y-2">
            {stale && (
              <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                New messages have come in since this was generated — refresh for an up-to-date read.
              </p>
            )}
            <p className="text-sm text-[var(--hq-text)]">{summary}</p>
            {generatedAt && (
              <span className="text-xs text-[var(--hq-text-muted)]">
                Generated {new Date(generatedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
