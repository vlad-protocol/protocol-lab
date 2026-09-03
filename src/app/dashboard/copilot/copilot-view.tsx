"use client";

import { useState } from "react";
import { Plus, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Note = {
  id: string;
  title: string;
  contactId: string | null;
  contact: Contact | null;
  transcript: string | null;
  summary: string | null;
  decisions: string | null;
  actionItems: string | null;
  createdAt: string;
};

export function CopilotView({ initialNotes, contacts }: { initialNotes: Note[]; contacts: Contact[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    contactId: "",
    transcript: "",
    summary: "",
    decisions: "",
    actionItems: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/meeting-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, contactId: form.contactId || undefined }),
    });
    const data = await res.json();
    if (data.note) setNotes((prev) => [data.note, ...prev]);
    setForm({ title: "", contactId: "", transcript: "", summary: "", decisions: "", actionItems: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/meeting-notes/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> New note
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New meeting note</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Title (e.g. 'Kickoff call — Sauna Co.')"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="">No contact linked</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.contactName}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Transcript / raw notes"
              value={form.transcript}
              onChange={(e) => setForm((f) => ({ ...f, transcript: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={4}
            />
            <textarea
              placeholder="Summary"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              rows={3}
            />
            <textarea
              placeholder="Decisions"
              value={form.decisions}
              onChange={(e) => setForm((f) => ({ ...f, decisions: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              rows={3}
            />
            <textarea
              placeholder="Action items"
              value={form.actionItems}
              onChange={(e) => setForm((f) => ({ ...f, actionItems: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save note"}
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {notes.map((note) => {
          const isOpen = expanded === note.id;
          return (
            <div key={note.id} className="group rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
              <div
                className="flex cursor-pointer items-start justify-between gap-2"
                onClick={() => setExpanded(isOpen ? null : note.id)}
              >
                <div>
                  <h4 className="text-sm font-semibold text-[var(--hq-text)]">{note.title}</h4>
                  <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
                    {note.contact?.companyName || note.contact?.contactName || "No contact linked"} ·{" "}
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(note.id);
                    }}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                  </button>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-[var(--hq-text-muted)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--hq-text-muted)]" />
                  )}
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 flex flex-col gap-3 border-t border-[var(--hq-card-border)] pt-3 text-sm">
                  {note.summary && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Summary</p>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--hq-text)]">{note.summary}</p>
                    </div>
                  )}
                  {note.decisions && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Decisions</p>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--hq-text)]">{note.decisions}</p>
                    </div>
                  )}
                  {note.actionItems && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Action items</p>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--hq-text)]">{note.actionItems}</p>
                    </div>
                  )}
                  {note.transcript && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Transcript</p>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--hq-text-muted)]">{note.transcript}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {notes.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            No notes yet.
          </div>
        )}
      </div>
    </div>
  );
}
