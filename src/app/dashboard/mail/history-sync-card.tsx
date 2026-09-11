"use client";

import { useEffect, useRef, useState } from "react";
import { History, Loader2 } from "lucide-react";

type Progress = { running: boolean; done: boolean; processed: number; matched: number };

export function HistorySyncCard({ connected, email }: { connected: boolean; email: string | null }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!connected) return;
    fetch("/api/mail/history-sync")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setProgress(d);
      })
      .catch(() => {});
  }, [connected]);

  async function runLoop(restart: boolean) {
    stopRef.current = false;
    setSyncing(true);
    setError(null);
    let first = true;
    while (!stopRef.current) {
      const res = await fetch("/api/mail/history-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(first && restart ? { restart: true } : {}),
      });
      first = false;
      const d = await res.json().catch(() => null);
      if (!res.ok || !d) {
        setError(d?.error || "Sync failed.");
        break;
      }
      setProgress({ running: !d.done, done: d.done, processed: d.processed, matched: d.matched });
      if (d.done) break;
    }
    setSyncing(false);
  }

  if (!connected) return null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
            <History className="h-3.5 w-3.5 text-[var(--hq-accent)]" /> Full Sent-mail history sync
          </p>
          <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
            Scans every sent email in {email}&apos;s mailbox — not just recent ones — and attaches it to
            any lead on the To line, cc&apos;d, or in the From header, so their whole history shows up on the
            contact page.
          </p>
          {progress && (
            <p className="mt-2 text-xs text-[var(--hq-text-muted)]">
              {progress.done
                ? `Done — scanned ${progress.processed} sent emails, linked ${progress.matched} to leads.`
                : progress.processed > 0
                  ? `In progress — scanned ${progress.processed} so far, ${progress.matched} linked to leads.`
                  : null}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {syncing ? (
            <button
              onClick={() => {
                stopRef.current = true;
              }}
              className="flex items-center gap-1.5 rounded-md border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)]"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Stop
            </button>
          ) : (
            <button
              onClick={() => runLoop(!!progress?.done)}
              className="rounded-md bg-[var(--hq-text)] px-3 py-1.5 text-xs font-medium text-white"
            >
              {progress?.processed ? (progress.done ? "Re-scan from the start" : "Resume scan") : "Scan full history"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
