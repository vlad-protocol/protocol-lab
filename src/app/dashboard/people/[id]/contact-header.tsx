"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Mail, Phone, Trash2 } from "lucide-react";

type Rep = { id: string; name: string | null; email: string };
type Contact = {
  id: string;
  contactName: string;
  companyName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  assignedRep: Rep | null;
};

export function ContactHeader({
  contact,
  reps,
  canDelete,
}: {
  contact: Contact;
  reps: Rep[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(contact.status);
  const [assignedRepId, setAssignedRepId] = useState(contact.assignedRep?.id || "");

  async function updateField(patch: Record<string, unknown>) {
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete ${contact.contactName} and their whole history? This can't be undone.`)) return;
    await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    router.push("/dashboard/people");
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--hq-text)]">{contact.contactName}</h1>
          {contact.title && contact.companyName && (
            <p className="flex items-center gap-1 text-sm text-[var(--hq-text-muted)]">
              <Building2 className="h-3.5 w-3.5" />
              {contact.title} at {contact.companyName}
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
        {contact.email && (
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {contact.email}
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {contact.phone}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">
            Status
          </label>
          <select
            className="mt-1 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateField({ status: e.target.value });
            }}
          >
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="CLIENT">Client</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">
            Assigned rep
          </label>
          <select
            className="mt-1 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm"
            value={assignedRepId}
            onChange={(e) => {
              setAssignedRepId(e.target.value);
              updateField({ assignedRepId: e.target.value || null });
            }}
          >
            <option value="">Unassigned</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {contact.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-[var(--hq-canvas)] p-3 text-sm text-[var(--hq-text)]">
          {contact.notes}
        </p>
      )}
    </div>
  );
}
