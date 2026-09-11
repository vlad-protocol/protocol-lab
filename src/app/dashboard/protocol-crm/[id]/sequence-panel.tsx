"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Pause, Play, X } from "lucide-react";

type Sequence = { id: string; name: string };
type Enrollment = {
  id: string;
  status: "ACTIVE" | "PAUSED" | "REPLIED" | "COMPLETED" | "CANCELED" | "AWAITING_CONFIRMATION";
  currentStep: number;
  nextSendAt: string | null;
  lastSentAt: string | null;
  sequence: { id: string; name: string; stepCount: number };
};

const STATUS_LABEL: Record<Enrollment["status"], string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  REPLIED: "Paused — they replied",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  AWAITING_CONFIRMATION: "Draft awaiting your confirmation",
};

const STATUS_COLOR: Record<Enrollment["status"], string> = {
  ACTIVE: "bg-[var(--hq-accent-soft)] text-[var(--hq-accent)]",
  PAUSED: "bg-amber-50 text-amber-700",
  REPLIED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-[var(--hq-positive)]/10 text-[var(--hq-positive)]",
  CANCELED: "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]",
  AWAITING_CONFIRMATION: "bg-[var(--hq-accent)]/10 text-[var(--hq-accent)]",
};

export function SequencePanel({
  contactId,
  sequences,
  enrollments,
}: {
  contactId: string;
  sequences: Sequence[];
  enrollments: Enrollment[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(sequences[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/contacts/${contactId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId: selected }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Failed to enroll.");
      return;
    }
    router.refresh();
  }

  async function setStatus(enrollmentId: string, status: "ACTIVE" | "PAUSED" | "CANCELED") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Failed to update.");
      return;
    }
    router.refresh();
  }

  const activeSequenceIds = new Set(
    enrollments
      .filter((e) => e.status === "ACTIVE" || e.status === "PAUSED" || e.status === "REPLIED" || e.status === "AWAITING_CONFIRMATION")
      .map((e) => e.sequence.id)
  );
  const availableToEnroll = sequences.filter((s) => !activeSequenceIds.has(s.id));

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--hq-text)]">Automated follow-up sequence</p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {enrollments.length === 0 && (
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">Not enrolled in any follow-up sequence.</p>
      )}

      <div className="mt-2 space-y-2">
        {enrollments.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-[var(--hq-card-border)] p-3">
            <div>
              <p className="text-sm font-medium text-[var(--hq-text)]">{e.sequence.name}</p>
              <p className="text-xs text-[var(--hq-text-muted)]">
                Step {Math.min(e.currentStep + 1, e.sequence.stepCount)} of {e.sequence.stepCount}
                {e.status === "ACTIVE" && e.nextSendAt && (
                  <> · next send {new Date(e.nextSendAt).toLocaleString()}</>
                )}
                {e.lastSentAt && <> · last sent {new Date(e.lastSentAt).toLocaleDateString()}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLOR[e.status]}`}>
                {STATUS_LABEL[e.status]}
              </span>
              {(e.status === "PAUSED" || e.status === "REPLIED") && (
                <button
                  onClick={() => setStatus(e.id, "ACTIVE")}
                  disabled={busy}
                  title="Resume"
                  className="text-[var(--hq-text-muted)] hover:text-[var(--hq-accent)] disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              {e.status === "ACTIVE" && (
                <button
                  onClick={() => setStatus(e.id, "PAUSED")}
                  disabled={busy}
                  title="Pause"
                  className="text-[var(--hq-text-muted)] hover:text-amber-600 disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
              {(e.status === "ACTIVE" || e.status === "PAUSED" || e.status === "REPLIED") && (
                <button
                  onClick={() => setStatus(e.id, "CANCELED")}
                  disabled={busy}
                  title="Cancel"
                  className="text-[var(--hq-text-muted)] hover:text-red-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {e.status === "AWAITING_CONFIRMATION" && (
                <Link
                  href="/dashboard/automation-confirmations"
                  className="text-xs font-medium text-[var(--hq-accent)] hover:underline"
                >
                  Review draft
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {availableToEnroll.length > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          >
            {availableToEnroll.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={enroll}
            disabled={busy || !selected}
            className="flex items-center gap-1 rounded-md bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Enroll
          </button>
        </div>
      ) : sequences.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--hq-text-muted)]">
          No sequences yet —{" "}
          <Link href="/dashboard/sequences" className="text-[var(--hq-accent)] hover:underline">
            create one
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
