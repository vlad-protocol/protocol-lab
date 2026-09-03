"use client";

import { useState } from "react";
import { Plus, X, Trash2, ExternalLink, Video, Phone, Monitor } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Recording = {
  id: string;
  title: string;
  url: string;
  kind: "SCREEN" | "CALL" | "VIDEO";
  contactId: string | null;
  contact: Contact | null;
  notes: string | null;
  createdAt: string;
};

const KIND_ICON: Record<Recording["kind"], typeof Video> = {
  SCREEN: Monitor,
  CALL: Phone,
  VIDEO: Video,
};

export function RecordingsView({
  initialRecordings,
  contacts,
}: {
  initialRecordings: Recording[];
  contacts: Contact[];
}) {
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", kind: "SCREEN" as Recording["kind"], contactId: "", notes: "" });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/recordings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, contactId: form.contactId || undefined, notes: form.notes || undefined }),
    });
    const data = await res.json();
    if (data.recording) setRecordings((prev) => [data.recording, ...prev]);
    setForm({ title: "", url: "", kind: "SCREEN", contactId: "", notes: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function remove(id: string) {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/recordings/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add recording
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">Add recording</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as Recording["kind"] }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="SCREEN">Screen recording</option>
              <option value="CALL">Call recording</option>
              <option value="VIDEO">Video</option>
            </select>
            <select
              value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="">No contact linked</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.contactName}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Link (Loom, Drive, Twilio recording URL…)"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
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
            {submitting ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {recordings.map((r) => {
          const Icon = KIND_ICON[r.kind];
          return (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="group relative rounded-xl border border-[var(--hq-card-border)] bg-white p-4 hover:border-[var(--hq-accent)]"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  remove(r.id);
                }}
                className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
              </button>
              <div className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
                <Icon className="h-3.5 w-3.5" />
                {r.kind}
              </div>
              <h4 className="mt-1 flex items-center gap-1 text-sm font-medium text-[var(--hq-text)]">
                {r.title}
                <ExternalLink className="h-3 w-3 text-[var(--hq-text-muted)]" />
              </h4>
              {r.contact && (
                <p className="mt-0.5 text-xs text-[var(--hq-accent)]">
                  {r.contact.companyName || r.contact.contactName}
                </p>
              )}
              {r.notes && <p className="mt-1 text-xs text-[var(--hq-text-muted)]">{r.notes}</p>}
            </a>
          );
        })}
        {recordings.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            Nothing here yet.
          </div>
        )}
      </div>
    </div>
  );
}
