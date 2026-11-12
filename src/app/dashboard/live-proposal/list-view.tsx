"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Row = { id: string; title: string; status: string; acceptedAt: string | null; createdAt: string; lead: string | null };

export function LiveProposalList({ proposals, contacts }: { proposals: Row[]; contacts: { id: string; label: string }[] }) {
  const router = useRouter();
  const [contactId, setContactId] = useState("");
  const [language, setLanguage] = useState("english");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/live-proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contactId || null, callLanguage: language }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error || "Couldn't start.");
    router.push(`/dashboard/live-proposal/${json.proposal.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[var(--hq-card-border)] p-4">
        <p className="text-sm font-semibold text-[var(--hq-text)]">Start a live proposal</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="rounded-lg border border-[var(--hq-card-border)] bg-transparent px-3 py-2 text-sm sm:col-span-2">
            <option value="">No lead (link later)</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-[var(--hq-card-border)] bg-transparent px-3 py-2 text-sm">
            <option value="english">Call in English</option>
            <option value="french">Call in French</option>
          </select>
        </div>
        <button onClick={start} disabled={busy} className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Starting…" : "Start"}
        </button>
        {error && <p className="mt-2 text-sm text-[var(--hq-negative)]">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {proposals.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">No live proposals yet.</div>
        )}
        {proposals.map((p) => (
          <Link key={p.id} href={`/dashboard/live-proposal/${p.id}`} className="flex items-center justify-between rounded-xl border border-[var(--hq-card-border)] px-4 py-3 text-sm">
            <span className="text-[var(--hq-text)]">{p.title}{p.lead && p.lead !== p.title ? ` · ${p.lead}` : ""}</span>
            <span className="text-xs text-[var(--hq-text-muted)]">
              {p.acceptedAt ? "Accepted" : p.status === "LIVE" ? "Live" : "Done"} · {new Date(p.createdAt).toLocaleDateString("en-CA")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
