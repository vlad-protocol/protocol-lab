"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { type Lead, OPEN_STATUSES, STATUS_OPTIONS, STATUS_STYLE } from "./types";
import { ProtocolCRMView } from "./protocol-crm-view";
import { ProtocolCRMBoard } from "./protocol-crm-board";
import { AddLeadButton } from "./add-lead-button";

type ViewMode = "list" | "board";

export function ProtocolCRMShell({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [view, setView] = useState<ViewMode>("board");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [repFilter, setRepFilter] = useState<string>("ALL");

  const stats = useMemo(() => {
    const clients = leads.filter((l) => l.type === "CLIENT").length;
    const sponsors = leads.filter((l) => l.type === "SPONSOR").length;
    const venues = leads.filter((l) => l.type === "VENUE").length;
    const won = leads.filter((l) => l.status === "WON").length;
    const active = leads.filter((l) => OPEN_STATUSES.includes(l.status)).length;

    let overdue = 0;
    for (const l of leads) {
      if (!OPEN_STATUSES.includes(l.status) || !l.nextFollowUpDate) continue;
      if (new Date(l.nextFollowUpDate).getTime() < Date.now()) overdue++;
    }

    const byStatus = new Map<string, number>();
    for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) || 0) + 1);

    return { clients, sponsors, venues, won, active, overdue, byStatus };
  }, [leads]);

  const reps = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.assignedRep) set.add(l.assignedRep);
    return [...set].sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (typeFilter !== "ALL" && l.type !== typeFilter) return false;
      if (repFilter !== "ALL" && (l.assignedRep || "Unassigned") !== repFilter) return false;
      if (q) {
        const hay = `${l.companyName || ""} ${l.contactName || ""} ${l.industry || ""} ${l.eventOpportunity || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, typeFilter, repFilter]);

  async function patch(id: string, data: Record<string, unknown>) {
    setSavingId(id);
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSavingId(null);
    if (res.ok) {
      const { contact } = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? contact : l)));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this lead and its whole history? This can't be undone.")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      {/* Dashboard */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active leads" value={stats.active} />
        <StatCard label="Clients" value={stats.clients} />
        <StatCard label="Sponsors" value={stats.sponsors} />
        <StatCard label="Venues" value={stats.venues} />
        <StatCard label="Deals won" value={stats.won} accent="text-emerald-600" />
        <StatCard label="Overdue follow-ups" value={stats.overdue} accent={stats.overdue > 0 ? "text-red-600" : undefined} />
      </div>

      <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <p className="text-xs font-semibold text-[var(--hq-text)]">Pipeline by stage</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => {
            const count = stats.byStatus.get(s.value) || 0;
            if (count === 0) return null;
            return (
              <span key={s.value} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[s.value]}`}>
                {s.label} ({count})
              </span>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-[var(--hq-card-border)] bg-white p-0.5">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
              view === "board" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
              view === "list" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, industry, event…"
            className="w-full rounded-lg border border-[var(--hq-card-border)] bg-white py-2 pl-8 pr-3 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2 py-2 text-sm"
        >
          <option value="ALL">All types</option>
          <option value="CLIENT">Clients</option>
          <option value="SPONSOR">Sponsors</option>
          <option value="VENUE">Venues</option>
        </select>
        <select
          value={repFilter}
          onChange={(e) => setRepFilter(e.target.value)}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2 py-2 text-sm"
        >
          <option value="ALL">All reps</option>
          {reps.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <AddLeadButton onCreated={(lead) => setLeads((prev) => [...prev, lead])} />
      </div>

      <div className="mt-3">
        {view === "board" ? (
          <ProtocolCRMBoard leads={filtered} onPatch={patch} />
        ) : (
          <ProtocolCRMView leads={filtered} onPatch={patch} onRemove={remove} savingId={savingId} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent || "text-[var(--hq-text)]"}`}>{value}</p>
    </div>
  );
}
