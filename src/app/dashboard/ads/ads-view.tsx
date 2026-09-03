"use client";

import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Campaign = {
  id: string;
  name: string;
  platform: string;
  clientId: string | null;
  client: Contact | null;
  budget: number | null;
  spend: number | null;
  results: string | null;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  notes: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-700",
  ENDED: "bg-neutral-100 text-neutral-500",
};

function money(n: number | null) {
  if (n === null) return "—";
  return `$${n.toLocaleString()}`;
}

export function AdsView({
  initialCampaigns,
  contacts,
}: {
  initialCampaigns: Campaign[];
  contacts: Contact[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    platform: "meta",
    clientId: "",
    budget: "",
    spend: "",
    results: "",
    notes: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        clientId: form.clientId || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        spend: form.spend ? Number(form.spend) : undefined,
        results: form.results || undefined,
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    if (data.campaign) setCampaigns((prev) => [data.campaign, ...prev]);
    setForm({ name: "", platform: "meta", clientId: "", budget: "", spend: "", results: "", notes: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function setStatus(id: string, status: Campaign["status"]) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    await fetch(`/api/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add campaign
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New campaign</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Campaign name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="meta">Meta</option>
              <option value="tiktok">TikTok</option>
              <option value="google">Google</option>
              <option value="other">Other</option>
            </select>
            <select
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="">No client linked</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.contactName}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Budget ($)"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Spend so far ($)"
              value={form.spend}
              onChange={(e) => setForm((f) => ({ ...f, spend: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            />
            <input
              placeholder="Results (e.g. '38 leads @ $12 CPL')"
              value={form.results}
              onChange={(e) => setForm((f) => ({ ...f, results: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add campaign"}
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Budget / Spend</th>
              <th className="px-4 py-3">Results</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="group border-b border-[var(--hq-card-border)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--hq-text)]">{c.name}</td>
                <td className="px-4 py-3 text-[var(--hq-text-muted)]">
                  {c.client?.companyName || c.client?.contactName || "—"}
                </td>
                <td className="px-4 py-3 capitalize text-[var(--hq-text-muted)]">{c.platform}</td>
                <td className="px-4 py-3 text-[var(--hq-text-muted)]">
                  {money(c.budget)} / {money(c.spend)}
                </td>
                <td className="px-4 py-3 text-[var(--hq-text-muted)]">{c.results || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.status}
                    onChange={(e) => setStatus(c.id, e.target.value as Campaign["status"])}
                    className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="ENDED">ENDED</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(c.id)}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--hq-text-muted)]">No campaigns yet.</div>
        )}
      </div>
    </div>
  );
}
