"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { type Lead, type LeadStatus, STATUS_BAR, STATUS_OPTIONS, TYPE_STYLE, money } from "./types";

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

export function ProtocolCRMBoard({
  leads,
  onPatch,
}: {
  leads: Lead[];
  onPatch: (id: string, data: Record<string, unknown>) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<LeadStatus | null>(null);

  const columns = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>();
    for (const s of STATUS_OPTIONS) map.set(s.value, []);
    for (const l of leads) map.get(l.status)?.push(l);
    return map;
  }, [leads]);

  function handleDrop(status: LeadStatus) {
    if (dragId) onPatch(dragId, { status });
    setDragId(null);
    setOverStatus(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUS_OPTIONS.map((col) => {
        const items = columns.get(col.value) || [];
        const total = items.reduce((sum, l) => sum + (l.dealValue || 0), 0);
        const isOver = overStatus === col.value;
        return (
          <div
            key={col.value}
            className={`w-64 shrink-0 rounded-xl border bg-[var(--hq-canvas)] transition-colors ${
              isOver ? "border-[var(--hq-accent)]" : "border-[var(--hq-card-border)]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStatus(col.value);
            }}
            onDragLeave={() => setOverStatus((s) => (s === col.value ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(col.value);
            }}
          >
            <div className={`h-1 rounded-t-xl ${STATUS_BAR[col.value]}`} />
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-[var(--hq-text)]">{col.label}</p>
              <p className="text-xs text-[var(--hq-text-muted)]">
                {total > 0 ? `${money(total)} · ` : ""}
                {items.length} deal{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="min-h-[60px] space-y-2 px-2 pb-3">
              {items.map((l) => {
                const days = daysUntil(l.nextFollowUpDate);
                const overdue = days !== null && days < 0;
                return (
                  <Link
                    key={l.id}
                    href={`/dashboard/protocol-crm/${l.id}`}
                    draggable
                    onDragStart={(e) => {
                      setDragId(l.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`block cursor-grab rounded-lg border border-[var(--hq-card-border)] bg-white p-3 shadow-sm hover:border-[var(--hq-accent)] active:cursor-grabbing ${
                      dragId === l.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-[var(--hq-text)]">
                        {l.companyName || l.contactName}
                      </p>
                      {overdue && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />}
                    </div>
                    {l.companyName && l.contactName !== l.companyName && (
                      <p className="text-xs text-[var(--hq-text-muted)]">{l.contactName}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`rounded px-1 py-0.5 text-[10px] uppercase ${TYPE_STYLE[l.type]}`}>
                        {l.type}
                      </span>
                      {l.dealValue ? (
                        <span className="text-xs font-medium text-[var(--hq-text)]">{money(l.dealValue)}</span>
                      ) : null}
                    </div>
                    {l.assignedRep && (
                      <p className="mt-1 text-[11px] text-[var(--hq-text-muted)]">{l.assignedRep}</p>
                    )}
                  </Link>
                );
              })}
              {items.length === 0 && (
                <p className="px-1 py-2 text-center text-[11px] text-[var(--hq-text-muted)]">No leads</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
