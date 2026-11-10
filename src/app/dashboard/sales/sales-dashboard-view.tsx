"use client";

import { useEffect, useState } from "react";
import { Loader2, PhoneOutgoing, PhoneIncoming, Voicemail, CalendarCheck2, RotateCcw, Users, FileText, Plus, Trash2, Pencil } from "lucide-react";

type RepTotals = {
  userId: string | null;
  name: string;
  callsMade: number;
  connected: number;
  noAnswer: number;
  voicemail: number;
  demoBooked: number;
  connectedNotBooked: number;
  rescheduled: number;
  untagged: number;
  connectRate: number | null;
  bookingRate: number | null;
};

type Metrics = { from: string; to: string; team: RepTotals; byRep: RepTotals[] };
type Rep = { id: string; name: string | null; email: string };

type SalesScript = {
  id: string;
  title: string;
  category: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
];

function pct(n: number | null) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--hq-text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--hq-text-muted)]">{sub}</p>}
    </div>
  );
}

export function SalesDashboardView({
  scripts: initialScripts,
  isOwner,
}: {
  scripts: SalesScript[];
  isOwner: boolean;
}) {
  const [range, setRange] = useState("today");
  const [repId, setRepId] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ range });
    if (repId) params.set("repId", repId);
    const res = await fetch(`/api/sales/metrics?${params.toString()}`);
    const d = await res.json().catch(() => ({}));
    setMetrics(d.metrics || null);
    setReps(d.reps || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, repId]);

  const team = metrics?.team;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              range === r.value
                ? "border-[var(--hq-accent)] bg-[var(--hq-accent)] text-white"
                : "border-[var(--hq-card-border)] bg-white text-[var(--hq-text)]"
            }`}
          >
            {r.label}
          </button>
        ))}
        <select
          value={repId}
          onChange={(e) => setRepId(e.target.value)}
          className="rounded-full border border-[var(--hq-card-border)] bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Team (all reps)</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || r.email}
            </option>
          ))}
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--hq-text-muted)]" />}
      </div>

      {team && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile icon={<PhoneOutgoing className="h-3.5 w-3.5" />} label="Calls made" value={team.callsMade} />
          <StatTile
            icon={<PhoneIncoming className="h-3.5 w-3.5" />}
            label="Connected"
            value={team.connected}
            sub={`${pct(team.connectRate)} connect rate`}
          />
          <StatTile icon={<PhoneOutgoing className="h-3.5 w-3.5 rotate-[135deg]" />} label="No answer" value={team.noAnswer} />
          <StatTile icon={<Voicemail className="h-3.5 w-3.5" />} label="Voicemail" value={team.voicemail} />
          <StatTile
            icon={<CalendarCheck2 className="h-3.5 w-3.5" />}
            label="Demo booked"
            value={team.demoBooked}
            sub={`${pct(team.bookingRate)} booking rate`}
          />
          <StatTile icon={<RotateCcw className="h-3.5 w-3.5" />} label="Rescheduled" value={team.rescheduled} />
        </div>
      )}

      {team && team.untagged > 0 && (
        <p className="text-xs text-[var(--hq-text-muted)]">
          {team.untagged} call{team.untagged === 1 ? "" : "s"} logged in this range {team.untagged === 1 ? "has" : "have"} no
          outcome tagged yet — set one from the lead's Communication Log to count toward connect/booking rate.
        </p>
      )}

      {metrics && metrics.byRep.length > 0 && (
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
            <Users className="h-4 w-4" /> By rep
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--hq-text-muted)]">
                  <th className="py-1 pr-3">Rep</th>
                  <th className="py-1 pr-3 text-right">Calls</th>
                  <th className="py-1 pr-3 text-right">Connected</th>
                  <th className="py-1 pr-3 text-right">No answer</th>
                  <th className="py-1 pr-3 text-right">Voicemail</th>
                  <th className="py-1 pr-3 text-right">Demo booked</th>
                  <th className="py-1 pr-3 text-right">Rescheduled</th>
                  <th className="py-1 pr-3 text-right">Connect %</th>
                  <th className="py-1 text-right">Booking %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byRep.map((r) => (
                  <tr key={r.userId || "unassigned"} className="border-t border-[var(--hq-card-border)] tabular-nums">
                    <td className="py-1.5 pr-3 font-medium text-[var(--hq-text)]">{r.name}</td>
                    <td className="py-1.5 pr-3 text-right">{r.callsMade}</td>
                    <td className="py-1.5 pr-3 text-right">{r.connected}</td>
                    <td className="py-1.5 pr-3 text-right">{r.noAnswer}</td>
                    <td className="py-1.5 pr-3 text-right">{r.voicemail}</td>
                    <td className="py-1.5 pr-3 text-right">{r.demoBooked}</td>
                    <td className="py-1.5 pr-3 text-right">{r.rescheduled}</td>
                    <td className="py-1.5 pr-3 text-right">{pct(r.connectRate)}</td>
                    <td className="py-1.5 text-right">{pct(r.bookingRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {metrics && metrics.byRep.length === 0 && !loading && (
        <p className="text-sm text-[var(--hq-text-muted)]">No calls logged in this range yet.</p>
      )}

      <ScriptsPanel initialScripts={initialScripts} isOwner={isOwner} />
    </div>
  );
}

function ScriptsPanel({ initialScripts, isOwner }: { initialScripts: SalesScript[]; isOwner: boolean }) {
  const [scripts, setScripts] = useState(initialScripts);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<SalesScript | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", body: "" });
  const [saving, setSaving] = useState(false);

  const categories = Array.from(new Set(scripts.map((s) => s.category)));

  async function refresh() {
    const res = await fetch("/api/sales/scripts");
    const d = await res.json().catch(() => ({}));
    setScripts(d.scripts || []);
  }

  async function saveNew() {
    if (!form.title || !form.category || !form.body) return;
    setSaving(true);
    const res = await fetch("/api/sales/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ title: "", category: "", body: "" });
      setAdding(false);
      refresh();
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/sales/scripts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editing.title, category: editing.category, body: editing.body }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this script?")) return;
    const res = await fetch(`/api/sales/scripts/${id}`, { method: "DELETE" });
    if (res.ok) refresh();
  }

  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
          <FileText className="h-4 w-4" /> Scripts
        </p>
        {isOwner && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--hq-accent)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add script
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 space-y-2 rounded-md bg-[var(--hq-canvas)] p-3">
          <input
            placeholder="Title (e.g. Demo call opener)"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Category (e.g. Demo call)"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <textarea
            placeholder="Script text"
            rows={4}
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <button
            disabled={saving}
            onClick={saveNew}
            className="rounded-md bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {categories.length === 0 && !adding && (
        <p className="mt-2 text-sm text-[var(--hq-text-muted)]">No scripts added yet.</p>
      )}

      <div className="mt-3 space-y-2">
        {categories.map((cat) => (
          <div key={cat} className="rounded-md border border-[var(--hq-card-border)]">
            <button
              onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-[var(--hq-text)]"
            >
              {cat}
            </button>
            {openCategory === cat && (
              <div className="space-y-2 border-t border-[var(--hq-card-border)] p-3">
                {scripts
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <div key={s.id} className="rounded-md bg-[var(--hq-canvas)] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--hq-text)]">{s.title}</p>
                        {isOwner && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditing(s)} title="Edit">
                              <Pencil className="h-3.5 w-3.5 text-neutral-500 hover:text-[var(--hq-accent)]" />
                            </button>
                            <button onClick={() => remove(s.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-neutral-500 hover:text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                      {editing?.id === s.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={4}
                            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                            value={editing.body}
                            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={saveEdit}
                              className="rounded-md bg-[var(--hq-accent)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditing(null)} className="text-xs text-[var(--hq-text-muted)]">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--hq-text-muted)]">{s.body}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
