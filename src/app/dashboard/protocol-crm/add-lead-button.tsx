"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ProtocolLead } from "./types";

export function AddLeadButton({ onCreated }: { onCreated: (lead: ProtocolLead) => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [leadType, setLeadType] = useState("SPONSOR");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/protocol-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: companyName.trim(), leadType }),
    });
    setSubmitting(false);
    if (res.ok) {
      const { lead } = await res.json();
      onCreated(lead);
      setCompanyName("");
      setLeadType("SPONSOR");
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
      >
        <Plus className="h-3.5 w-3.5" /> Add lead
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--hq-text)]">New lead</h2>
            <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
              Add the company now — fill in contact info, status, and everything else by expanding its row.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                required
                autoFocus
                placeholder="Company name"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <select
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={leadType}
                onChange={(e) => setLeadType(e.target.value)}
              >
                <option value="SPONSOR">Sponsor</option>
                <option value="VENUE">Venue</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-[var(--hq-text-muted)]"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting ? "Adding…" : "Add lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
