"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Search, Trash2 } from "lucide-react";
import {
  type LeadPriority,
  type LeadStatus,
  type ProtocolLead,
  OPEN_STATUSES,
  PRIORITY_STYLE,
  STATUS_OPTIONS,
  STATUS_STYLE,
  money,
} from "./types";
import { AddLeadButton } from "./add-lead-button";

const PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: "HOT", label: "Hot" },
  { value: "WARM", label: "Warm" },
  { value: "COLD", label: "Cold" },
];

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - startOfToday.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function followUpFlag(dateStr: string | null): { label: string; className: string } | null {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: "bg-red-100 text-red-700" };
  if (days === 0) return { label: "Due today", className: "bg-orange-100 text-orange-700" };
  if (days <= 7) return { label: `Due in ${days}d`, className: "bg-amber-100 text-amber-700" };
  return { label: new Date(dateStr!).toLocaleDateString(undefined, { month: "short", day: "numeric" }), className: "text-[var(--hq-text-muted)]" };
}

function fmtDateInput(dateStr: string | null) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

export function ProtocolCRMView({ initialLeads }: { initialLeads: ProtocolLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [repFilter, setRepFilter] = useState<string>("ALL");

  const stats = useMemo(() => {
    const sponsors = leads.filter((l) => l.leadType === "SPONSOR").length;
    const venues = leads.filter((l) => l.leadType === "VENUE").length;
    const won = leads.filter((l) => l.status === "WON").length;
    const active = leads.filter((l) => OPEN_STATUSES.includes(l.status)).length;

    let overdue = 0,
      dueToday = 0,
      dueWeek = 0;
    for (const l of leads) {
      if (!OPEN_STATUSES.includes(l.status)) continue;
      const days = daysUntil(l.nextFollowUpDate);
      if (days === null) continue;
      if (days < 0) overdue++;
      else if (days === 0) dueToday++;
      else if (days <= 7) dueWeek++;
    }

    const byStatus = new Map<LeadStatus, number>();
    for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) || 0) + 1);

    const byRep = new Map<string, { total: number; overdue: number }>();
    for (const l of leads) {
      const rep = l.assignedRep || "Unassigned";
      const entry = byRep.get(rep) || { total: 0, overdue: 0 };
      entry.total++;
      if (OPEN_STATUSES.includes(l.status)) {
        const days = daysUntil(l.nextFollowUpDate);
        if (days !== null && days < 0) entry.overdue++;
      }
      byRep.set(rep, entry);
    }

    return { sponsors, venues, won, active, overdue, dueToday, dueWeek, byStatus, byRep };
  }, [leads]);

  const reps = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.assignedRep) set.add(l.assignedRep);
    return [...set].sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter === "OPEN" && !OPEN_STATUSES.includes(l.status)) return false;
      if (statusFilter !== "OPEN" && statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && l.leadType !== typeFilter) return false;
      if (repFilter !== "ALL" && (l.assignedRep || "Unassigned") !== repFilter) return false;
      if (q) {
        const hay = `${l.companyName} ${l.contactName || ""} ${l.industry || ""} ${l.eventOpportunity || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, typeFilter, repFilter]);

  async function patch(id: string, data: Record<string, unknown>) {
    setSavingId(id);
    const res = await fetch(`/api/protocol-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSavingId(null);
    if (res.ok) {
      const { lead } = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? lead : l)));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this lead? This can't be undone.")) return;
    const res = await fetch(`/api/protocol-leads/${id}`, { method: "DELETE" });
    if (res.ok) setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      {/* Dashboard */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active leads" value={stats.active} />
        <StatCard label="Sponsors" value={stats.sponsors} />
        <StatCard label="Venues" value={stats.venues} />
        <StatCard label="Deals won" value={stats.won} accent="text-emerald-600" />
        <StatCard label="Overdue follow-ups" value={stats.overdue} accent={stats.overdue > 0 ? "text-red-600" : undefined} />
        <StatCard label="Due this week" value={stats.dueToday + stats.dueWeek} accent={stats.dueToday + stats.dueWeek > 0 ? "text-amber-600" : undefined} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs font-semibold text-[var(--hq-text)]">Pipeline by status</p>
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
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs font-semibold text-[var(--hq-text)]">Workload by rep</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--hq-text-muted)]">
            {[...stats.byRep.entries()].map(([rep, s]) => (
              <span key={rep}>
                {rep}: {s.total}
                {s.overdue > 0 && <span className="text-red-600"> ({s.overdue} overdue)</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2 py-2 text-sm"
        >
          <option value="OPEN">Open only</option>
          <option value="ALL">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2 py-2 text-sm"
        >
          <option value="ALL">Sponsors + Venues</option>
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
      <p className="mt-1.5 text-xs text-[var(--hq-text-muted)]">
        Showing {filtered.length} of {leads.length} leads.
      </p>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
            <tr>
              <th className="w-6 px-2 py-2"></th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Next follow-up</th>
              <th className="px-3 py-2 text-right">Deal value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const isOpen = openId === l.id;
              const flag = followUpFlag(l.nextFollowUpDate);
              return (
                <Fragment key={l.id}>
                  <tr
                    className="cursor-pointer border-b border-[var(--hq-card-border)] last:border-0 hover:bg-[var(--hq-canvas)]"
                    onClick={() => setOpenId(isOpen ? null : l.id)}
                  >
                    <td className="px-2 py-2.5 text-neutral-400">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-[var(--hq-text)]">{l.companyName}</span>
                      <span className="ml-1.5 rounded bg-[var(--hq-canvas)] px-1 py-0.5 text-[10px] uppercase text-[var(--hq-text-muted)]">
                        {l.leadType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--hq-text-muted)]">{l.contactName || "—"}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={l.status}
                        onChange={(e) => patch(l.id, { status: e.target.value })}
                        className={`rounded px-1.5 py-1 text-xs font-medium ${STATUS_STYLE[l.status]}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={l.priority || ""}
                        onChange={(e) => patch(l.id, { priority: e.target.value })}
                        className={`rounded px-1.5 py-1 text-xs font-medium ${l.priority ? PRIORITY_STYLE[l.priority] : "text-[var(--hq-text-muted)]"}`}
                      >
                        <option value="">—</option>
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--hq-text-muted)]">{l.assignedRep || "—"}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={fmtDateInput(l.nextFollowUpDate)}
                          onChange={(e) => patch(l.id, { nextFollowUpDate: e.target.value || null })}
                          className="rounded border border-[var(--hq-card-border)] px-1 py-0.5 text-xs"
                        />
                        {flag && OPEN_STATUSES.includes(l.status) && (
                          <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${flag.className}`}>{flag.label}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[var(--hq-text)]">
                      {l.dealValue ? money(l.dealValue) : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)]/40">
                      <td colSpan={8} className="px-4 py-4">
                        <LeadDetail lead={l} onPatch={(data) => patch(l.id, data)} onDelete={() => remove(l.id)} saving={savingId === l.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-[var(--hq-text-muted)]">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase text-[var(--hq-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "rounded border border-[var(--hq-card-border)] bg-white px-2 py-1.5 text-xs";

function LeadDetail({
  lead,
  onPatch,
  onDelete,
  saving,
}: {
  lead: ProtocolLead;
  onPatch: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(lead);

  function commit(field: keyof ProtocolLead) {
    if (draft[field] !== lead[field]) onPatch({ [field]: draft[field] });
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Industry / category">
          <input className={inputCls} value={draft.industry || ""} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} onBlur={() => commit("industry")} />
        </Field>
        <Field label="Contact title">
          <input className={inputCls} value={draft.contactTitle || ""} onChange={(e) => setDraft({ ...draft, contactTitle: e.target.value })} onBlur={() => commit("contactTitle")} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} onBlur={() => commit("phone")} />
        </Field>
        <Field label="Email">
          <input className={inputCls} value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onBlur={() => commit("email")} />
        </Field>
        <Field label="Website / LinkedIn">
          <input className={inputCls} value={draft.website || ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} onBlur={() => commit("website")} />
        </Field>
        <Field label="Source">
          <input className={inputCls} value={draft.source || ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} onBlur={() => commit("source")} />
        </Field>
        <Field label="Assigned rep">
          <input className={inputCls} value={draft.assignedRep || ""} onChange={(e) => setDraft({ ...draft, assignedRep: e.target.value })} onBlur={() => commit("assignedRep")} />
        </Field>
        <Field label="Follow-up owner">
          <input className={inputCls} value={draft.followUpOwner || ""} onChange={(e) => setDraft({ ...draft, followUpOwner: e.target.value })} onBlur={() => commit("followUpOwner")} />
        </Field>
        <Field label="Date first contacted">
          <input type="date" className={inputCls} value={fmtDateInput(draft.dateFirstContacted)} onChange={(e) => setDraft({ ...draft, dateFirstContacted: e.target.value || null })} onBlur={() => commit("dateFirstContacted")} />
        </Field>
        <Field label="Last contact date">
          <input type="date" className={inputCls} value={fmtDateInput(draft.lastContactDate)} onChange={(e) => setDraft({ ...draft, lastContactDate: e.target.value || null })} onBlur={() => commit("lastContactDate")} />
        </Field>
        <Field label="Total touches">
          <input type="number" min={0} className={inputCls} value={draft.totalTouches} onChange={(e) => setDraft({ ...draft, totalTouches: Number(e.target.value) })} onBlur={() => commit("totalTouches")} />
        </Field>
        <Field label="Event / opportunity">
          <input className={inputCls} value={draft.eventOpportunity || ""} onChange={(e) => setDraft({ ...draft, eventOpportunity: e.target.value })} onBlur={() => commit("eventOpportunity")} />
        </Field>
        <Field label="Deal value ($)">
          <input type="number" min={0} className={inputCls} value={draft.dealValue ?? ""} onChange={(e) => setDraft({ ...draft, dealValue: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => commit("dealValue")} />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Last conversation summary">
          <textarea rows={3} className={inputCls} value={draft.lastConversationSummary || ""} onChange={(e) => setDraft({ ...draft, lastConversationSummary: e.target.value })} onBlur={() => commit("lastConversationSummary")} />
        </Field>
        <Field label="Next step">
          <textarea rows={3} className={inputCls} value={draft.nextStep || ""} onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })} onBlur={() => commit("nextStep")} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes / objections">
          <textarea rows={2} className={inputCls} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => commit("notes")} />
        </Field>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-[var(--hq-text-muted)]">{saving ? "Saving…" : " "}</span>
        <button onClick={onDelete} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" /> Delete lead
        </button>
      </div>
    </div>
  );
}
