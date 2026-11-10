"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  PhoneOutgoing,
  Voicemail,
  CalendarCheck2,
  Users,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Settings,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type RepTotals = {
  userId: string | null;
  name: string;
  dials: number;
  noAnswer: number;
  voicemail: number;
  gatekeeper: number;
  ownerReached: number;
  pitched: number;
  conversation: number;
  videoCallBooked: number;
  qualityNoes: number;
  untagged: number;
  pickupRate: number | null;
  pitchRate: number | null;
  conversationRate: number | null;
  bookingRate: number | null;
  dailyDialTarget: number | null;
};

type CallRow = {
  id: string;
  occurredAt: string;
  userId: string | null;
  repName: string;
  contactId: string;
  contactName: string;
  callStageReached: string | null;
  resultTag: string;
  durationSeconds: number | null;
};

type Metrics = { from: string; to: string; team: RepTotals; byRep: RepTotals[]; calls: CallRow[] };
type Rep = { id: string; name: string | null; email: string; salesDailyDialTarget: number | null };
type Benchmark = { id: string; metricKey: string; label: string; unit: string; amberMin: number; greenMin: number };

type SalesScript = {
  id: string;
  title: string;
  category: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const STAGE_LABEL: Record<string, string> = {
  NO_ANSWER: "No answer",
  VOICEMAIL: "Voicemail left",
  GATEKEEPER: "Gatekeeper only",
  OWNER_REACHED: "Owner reached",
  PITCHED: "Pitched",
  CONVERSATION_2MIN: "Conversation (2min+)",
  VIDEO_CALL_BOOKED: "Video call booked",
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

function pct(n: number | null) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function statusColor(status: "red" | "amber" | "green" | null) {
  if (status === "green") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "amber") return "border-amber-300 bg-amber-50 text-amber-800";
  if (status === "red") return "border-red-300 bg-red-50 text-red-800";
  return "border-[var(--hq-card-border)] bg-white text-[var(--hq-text)]";
}

function benchmarkStatus(value: number | null, b: Benchmark | undefined): "red" | "amber" | "green" | null {
  if (value == null || !b) return null;
  if (value >= b.greenMin) return "green";
  if (value >= b.amberMin) return "amber";
  return "red";
}

function KpiCard({
  label,
  value,
  sub,
  status,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  status: "red" | "amber" | "green" | null;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border p-4 text-left ${statusColor(status)} ${onClick ? "hover:opacity-90" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </button>
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
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [repId, setRepId] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<{ title: string; calls: CallRow[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ range });
    if (repId) params.set("repId", repId);
    if (range === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    const res = await fetch(`/api/sales/metrics?${params.toString()}`);
    const d = await res.json().catch(() => ({}));
    setMetrics(d.metrics || null);
    setReps(d.reps || []);
    setBenchmarks(d.benchmarks || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, repId, customFrom, customTo]);

  const team = metrics?.team;
  const benchmarkByKey = Object.fromEntries(benchmarks.map((b) => [b.metricKey, b]));

  function openDrilldown(title: string, filter: (c: CallRow) => boolean) {
    if (!metrics) return;
    setDrilldown({ title, calls: metrics.calls.filter(filter) });
  }

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
        {range === "custom" && (
          <span className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
            />
            <span className="text-xs text-[var(--hq-text-muted)]">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
            />
          </span>
        )}
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
        {isOwner && (
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-[var(--hq-text-muted)] hover:text-[var(--hq-accent)]"
          >
            <Settings className="h-3.5 w-3.5" /> Targets & benchmarks
          </button>
        )}
      </div>

      {isOwner && showSettings && (
        <SettingsPanel
          benchmarks={benchmarks}
          reps={reps}
          onBenchmarksChanged={setBenchmarks}
          onRepsChanged={setReps}
        />
      )}

      {team && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Dials"
            value={String(team.dials)}
            sub={!repId && team.dials > 0 ? `${Math.round(team.dials / Math.max(1, metrics!.byRep.length))} avg/rep` : undefined}
            status={benchmarkStatus(team.dials, benchmarkByKey["dials_per_rep_day"])}
            onClick={() => openDrilldown("All dials", () => true)}
          />
          <KpiCard
            label="Pickup rate"
            value={pct(team.pickupRate)}
            sub={`${team.ownerReached} owner reached`}
            status={benchmarkStatus(team.pickupRate != null ? team.pickupRate * 100 : null, benchmarkByKey["pickup_rate"])}
            onClick={() => openDrilldown("Owner reached", (c) => ["OWNER_REACHED", "PITCHED", "CONVERSATION_2MIN", "VIDEO_CALL_BOOKED"].includes(c.callStageReached || ""))}
          />
          <KpiCard
            label="Pitch rate"
            value={pct(team.pitchRate)}
            sub={`${team.pitched} pitched`}
            status={benchmarkStatus(team.pitchRate != null ? team.pitchRate * 100 : null, benchmarkByKey["pitch_rate"])}
            onClick={() => openDrilldown("Pitched", (c) => ["PITCHED", "CONVERSATION_2MIN", "VIDEO_CALL_BOOKED"].includes(c.callStageReached || ""))}
          />
          <KpiCard
            label="Conversation rate"
            value={pct(team.conversationRate)}
            sub={`${team.conversation} 2min+`}
            status={benchmarkStatus(team.conversationRate != null ? team.conversationRate * 100 : null, benchmarkByKey["conversation_rate"])}
            onClick={() => openDrilldown("2+ minute conversations", (c) => ["CONVERSATION_2MIN", "VIDEO_CALL_BOOKED"].includes(c.callStageReached || ""))}
          />
          <KpiCard
            label="Booking rate"
            value={pct(team.bookingRate)}
            sub={`${team.videoCallBooked} booked`}
            status={benchmarkStatus(team.bookingRate != null ? team.bookingRate * 100 : null, benchmarkByKey["booking_rate"])}
            onClick={() => openDrilldown("Video calls booked", (c) => c.callStageReached === "VIDEO_CALL_BOOKED")}
          />
        </div>
      )}

      {team && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="No answer"
            value={String(team.noAnswer)}
            status={null}
            onClick={() => openDrilldown("No answer", (c) => c.callStageReached === "NO_ANSWER")}
          />
          <KpiCard
            label="Voicemail"
            value={String(team.voicemail)}
            status={null}
            onClick={() => openDrilldown("Voicemail left", (c) => c.callStageReached === "VOICEMAIL")}
          />
          <KpiCard
            label="Quality noes"
            value={String(team.qualityNoes)}
            sub="objected 2x+, still asked a real question"
            status={null}
            onClick={() => openDrilldown("Quality noes", (c) => c.resultTag === "NOT_INTERESTED")}
          />
          <KpiCard
            label="Untagged"
            value={String(team.untagged)}
            sub="no stage set yet"
            status={null}
            onClick={() => openDrilldown("Untagged calls", (c) => !c.callStageReached)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 opacity-60 sm:grid-cols-2">
        <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">Show rate</p>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">Needs the Video Calls module (coming next)</p>
        </div>
        <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">Close rate</p>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">Needs the Video Calls module (coming next)</p>
        </div>
      </div>

      {metrics && metrics.byRep.length > 0 && (
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
            <Users className="h-4 w-4" /> By rep
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--hq-text-muted)]">
                  <th className="py-1 pr-3">Rep</th>
                  <th className="py-1 pr-3 text-right">Dials</th>
                  <th className="py-1 pr-3 text-right">Target</th>
                  <th className="py-1 pr-3 text-right">Owner reached</th>
                  <th className="py-1 pr-3 text-right">Pitched</th>
                  <th className="py-1 pr-3 text-right">Booked</th>
                  <th className="py-1 pr-3 text-right">Pickup %</th>
                  <th className="py-1 text-right">Booking %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byRep.map((r) => (
                  <tr key={r.userId || "unassigned"} className="border-t border-[var(--hq-card-border)] tabular-nums">
                    <td className="py-1.5 pr-3 font-medium text-[var(--hq-text)]">
                      <button className="hover:underline" onClick={() => openDrilldown(`${r.name}'s calls`, (c) => c.userId === r.userId)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="py-1.5 pr-3 text-right">{r.dials}</td>
                    <td className="py-1.5 pr-3 text-right text-[var(--hq-text-muted)]">{r.dailyDialTarget ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right">{r.ownerReached}</td>
                    <td className="py-1.5 pr-3 text-right">{r.pitched}</td>
                    <td className="py-1.5 pr-3 text-right">{r.videoCallBooked}</td>
                    <td className="py-1.5 pr-3 text-right">{pct(r.pickupRate)}</td>
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

      {drilldown && <DrilldownModal title={drilldown.title} calls={drilldown.calls} onClose={() => setDrilldown(null)} />}
    </div>
  );
}

function DrilldownModal({ title, calls, onClose }: { title: string; calls: CallRow[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--hq-text)]">
            {title} <span className="text-[var(--hq-text-muted)]">({calls.length})</span>
          </p>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
          </button>
        </div>
        <div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
          {calls.length === 0 && <p className="text-sm text-[var(--hq-text-muted)]">No calls match.</p>}
          {calls.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/protocol-crm/${c.contactId}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-[var(--hq-canvas)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[var(--hq-text)]">{c.contactName}</span>
                <span className="block text-xs text-[var(--hq-text-muted)]">
                  {c.repName} · {new Date(c.occurredAt).toLocaleString()}
                </span>
              </span>
              <span className="shrink-0 text-xs text-[var(--hq-text-muted)]">
                {c.callStageReached ? STAGE_LABEL[c.callStageReached] : "Untagged"}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--hq-text-muted)]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  benchmarks,
  reps,
  onBenchmarksChanged,
  onRepsChanged,
}: {
  benchmarks: Benchmark[];
  reps: Rep[];
  onBenchmarksChanged: (b: Benchmark[]) => void;
  onRepsChanged: (r: Rep[]) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  async function saveBenchmark(b: Benchmark, amberMin: number, greenMin: number) {
    setSaving(b.metricKey);
    const res = await fetch("/api/sales/benchmarks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricKey: b.metricKey, amberMin, greenMin }),
    });
    setSaving(null);
    if (res.ok) {
      const d = await res.json();
      onBenchmarksChanged(benchmarks.map((x) => (x.metricKey === b.metricKey ? d.benchmark : x)));
    }
  }

  async function saveTarget(repId: string, target: number | null) {
    setSaving(repId);
    const res = await fetch(`/api/sales/reps/${repId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesDailyDialTarget: target }),
    });
    setSaving(null);
    if (res.ok) {
      onRepsChanged(reps.map((r) => (r.id === repId ? { ...r, salesDailyDialTarget: target } : r)));
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-4">
      <div>
        <p className="text-sm font-medium text-[var(--hq-text)]">KPI benchmarks</p>
        <p className="text-xs text-[var(--hq-text-muted)]">
          Amber/green thresholds from the Protocol Sales Playbook — adjust them as your targets change.
        </p>
        <div className="mt-2 space-y-2">
          {benchmarks.map((b) => (
            <BenchmarkRow key={b.metricKey} benchmark={b} saving={saving === b.metricKey} onSave={saveBenchmark} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--hq-text)]">Per-rep daily dial target</p>
        <div className="mt-2 space-y-2">
          {reps.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className="w-40 truncate text-[var(--hq-text)]">{r.name || r.email}</span>
              <input
                type="number"
                defaultValue={r.salesDailyDialTarget ?? ""}
                placeholder="e.g. 100"
                className="w-28 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
                onBlur={(e) => saveTarget(r.id, e.target.value ? Number(e.target.value) : null)}
              />
              {saving === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--hq-text-muted)]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenchmarkRow({
  benchmark,
  saving,
  onSave,
}: {
  benchmark: Benchmark;
  saving: boolean;
  onSave: (b: Benchmark, amberMin: number, greenMin: number) => void;
}) {
  const [amberMin, setAmberMin] = useState(String(benchmark.amberMin));
  const [greenMin, setGreenMin] = useState(String(benchmark.greenMin));

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-72 shrink-0 text-[var(--hq-text)]">{benchmark.label}</span>
      <span className="text-xs text-[var(--hq-text-muted)]">amber ≥</span>
      <input
        type="number"
        value={amberMin}
        onChange={(e) => setAmberMin(e.target.value)}
        className="w-20 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
      />
      <span className="text-xs text-[var(--hq-text-muted)]">green ≥</span>
      <input
        type="number"
        value={greenMin}
        onChange={(e) => setGreenMin(e.target.value)}
        className="w-20 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
      />
      <span className="text-xs text-[var(--hq-text-muted)]">{benchmark.unit === "percent" ? "%" : ""}</span>
      <button
        disabled={saving}
        onClick={() => onSave(benchmark, Number(amberMin), Number(greenMin))}
        className="rounded-md bg-[var(--hq-accent)] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        Save
      </button>
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
                            rows={6}
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
