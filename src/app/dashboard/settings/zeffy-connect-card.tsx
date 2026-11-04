"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZeffyConnectCard({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/integrations/zeffy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong.");
      return;
    }
    setApiKey("");
    router.refresh();
  }

  async function disconnect() {
    await fetch("/api/integrations/zeffy", { method: "DELETE" });
    router.refresh();
  }

  if (connected) {
    return (
      <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <p className="text-sm text-[var(--hq-text)]">Connected — ticket sales sync automatically.</p>
        <button onClick={disconnect} className="text-xs text-[var(--hq-text-muted)] hover:text-red-600">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        In Zeffy: Settings → Integrations → generate an API key (you must be an org admin),
        then paste it here.
      </p>
      <input
        required
        type="password"
        placeholder="Zeffy API key"
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? "Saving…" : "Connect Zeffy"}
      </button>
    </form>
  );
}
