"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rep = { id: string; name: string | null; email: string };

export function AddContactButton({ reps }: { reps: Rep[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contactName: "",
    companyName: "",
    title: "",
    email: "",
    phone: "",
    status: "LEAD",
    assignedRepId: reps[0]?.id || "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    setOpen(false);
    setForm((f) => ({ ...f, contactName: "", companyName: "", title: "", email: "", phone: "", notes: "" }));
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
      >
        Add contact
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--hq-text)]">New contact</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                required
                placeholder="Contact name"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Company"
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
                <input
                  placeholder="Title (e.g. CEO)"
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  placeholder="Phone"
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CLIENT">Client</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <select
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.assignedRepId}
                  onChange={(e) => setForm({ ...form, assignedRepId: e.target.value })}
                >
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.email}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Notes (optional)"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
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
                  {submitting ? "Adding…" : "Add contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
