"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";

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

  const weeksLabel = nextFollowUpDate
    ? `Follow up by ${new Date(nextFollowUpDate).toLocaleDateString()}`
    : "No follow-up needed";

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
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
          {nextStep && (
            <p className="text-sm text-[var(--hq-text)]">
              <span className="font-medium">Suggested next step:</span> {nextStep}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--hq-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--hq-accent)]">
              {weeksLabel}
            </span>
            {generatedAt && (
              <span className="text-xs text-[var(--hq-text-muted)]">
                Generated {new Date(generatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
