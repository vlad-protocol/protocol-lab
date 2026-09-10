"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Mail, Phone, Trash2 } from "lucide-react";
import {
  type LeadPriority,
  type LeadStatus,
  type LeadType,
  STATUS_OPTIONS,
  STATUS_STYLE,
  TYPE_STYLE,
} from "../types";

const PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: "HOT", label: "Hot" },
  { value: "WARM", label: "Warm" },
  { value: "COLD", label: "Cold" },
];

type Lead = {
  id: string;
  number: number;
  contactName: string;
  companyName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  type: LeadType;
  status: LeadStatus;
  priority: LeadPriority | null;
  assignedRep: string | null;
};

export function LeadHeader({ lead, canDelete }: { lead: Lead; canDelete: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(lead.status);
  const [priority, setPriority] = useState(lead.priority || "");
  const [type, setType] = useState(lead.type);
  const [assignedRep, setAssignedRep] = useState(lead.assignedRep || "");

  async function updateField(patch: Record<string, unknown>) {
    await fetch(`/api/contacts/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete ${lead.companyName || lead.contactName} and their whole history? This can't be undone.`)) return;
    await fetch(`/api/contacts/${lead.id}`, { method: "DELETE" });
    router.push("/dashboard/protocol-crm");
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--hq-text-muted)]">Lead #{lead.number}</p>
          <h1 className="text-xl font-semibold text-[var(--hq-text)]">
            {lead.companyName || lead.contactName}
          </h1>
          {lead.companyName && lead.contactName !== lead.companyName && (
            <p className="flex items-center gap-1 text-sm text-[var(--hq-text-muted)]">
              <Building2 className="h-3.5 w-3.5" />
              {lead.title ? `${lead.title}, ` : ""}
              {lead.contactName}
            </p>
          )}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--hq-text-muted)]">
        {lead.email && (
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {lead.email}
          </span>
        )}
        {lead.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {lead.phone}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">Type</label>
          <select
            className={`mt-1 rounded-md px-2 py-1 text-sm font-medium ${TYPE_STYLE[type]}`}
            value={type}
            onChange={(e) => {
              const v = e.target.value as LeadType;
              setType(v);
              updateField({ type: v });
            }}
          >
            <option value="CLIENT">Client</option>
            <option value="SPONSOR">Sponsor</option>
            <option value="VENUE">Venue</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">Status</label>
          <select
            className={`mt-1 rounded-md px-2 py-1 text-sm font-medium ${STATUS_STYLE[status]}`}
            value={status}
            onChange={(e) => {
              const v = e.target.value as LeadStatus;
              setStatus(v);
              updateField({ status: v });
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">Priority</label>
          <select
            className="mt-1 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as LeadPriority | "");
              updateField({ priority: e.target.value || null });
            }}
          >
            <option value="">—</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">
            Assigned rep
          </label>
          <input
            className="mt-1 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
            placeholder="Unassigned"
            value={assignedRep}
            onChange={(e) => setAssignedRep(e.target.value)}
            onBlur={() => updateField({ assignedRep: assignedRep || null })}
          />
        </div>
      </div>
    </div>
  );
}
