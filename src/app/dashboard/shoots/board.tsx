"use client";

import { useMemo, useState } from "react";
import { Plus, X, GripVertical, Trash2 } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Card = {
  id: string;
  contactId: string | null;
  clientLabel: string | null;
  title: string;
  notes: string | null;
  stage: "SCRIPTING" | "FILM" | "EDITING" | "READY" | "POSTED";
  order: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact | null;
  createdBy: { name: string | null; email: string } | null;
};

const STAGES: { key: Card["stage"]; label: string }[] = [
  { key: "SCRIPTING", label: "Scripting" },
  { key: "FILM", label: "Film" },
  { key: "EDITING", label: "Editing" },
  { key: "READY", label: "Ready to Post" },
  { key: "POSTED", label: "Posted" },
];

function clientOf(card: Card) {
  if (card.contact) return card.contact.companyName || card.contact.contactName;
  return card.clientLabel || "No client set";
}

export function ShootBoard({
  initialCards,
  contacts,
}: {
  initialCards: Card[];
  contacts: Contact[];
}) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", contactId: "", clientLabel: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const clientOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const c of cards) set.set(clientOf(c), clientOf(c));
    return Array.from(set.keys()).sort();
  }, [cards]);

  const visibleCards = useMemo(
    () => (clientFilter === "all" ? cards : cards.filter((c) => clientOf(c) === clientFilter)),
    [cards, clientFilter]
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/shoots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        contactId: form.contactId || undefined,
        clientLabel: form.contactId ? undefined : form.clientLabel || undefined,
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    if (data.card) setCards((prev) => [...prev, data.card]);
    setForm({ title: "", contactId: "", clientLabel: "", notes: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function moveCard(id: string, stage: Card["stage"]) {
    const target = cards.find((c) => c.id === id);
    if (!target || target.stage === stage) return;
    const order = cards.filter((c) => c.stage === stage).length;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage, order } : c)));
    await fetch(`/api/shoots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, order }),
    });
  }

  async function removeCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/shoots/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
        >
          <option value="all">All clients</option>
          {clientOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add card
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-5 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New content card</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Title (e.g. 'Steam room walkthrough reel')"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="">No CRM contact — use a label instead</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.contactName}
                </option>
              ))}
            </select>
            <input
              placeholder="Client label (e.g. 'Sauna manufacturer')"
              value={form.clientLabel}
              disabled={!!form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, clientLabel: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm disabled:bg-neutral-100"
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
            {submitting ? "Adding…" : "Add to Scripting"}
          </button>
        </form>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageCards = visibleCards
            .filter((c) => c.stage === stage.key)
            .sort((a, b) => a.order - b.order);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragId && moveCard(dragId, stage.key)}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-[var(--hq-canvas)] p-2"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--hq-text-muted)]">
                  {stage.label}
                </h3>
                <span className="text-xs text-[var(--hq-text-muted)]">{stageCards.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {stageCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => setDragId(null)}
                    className="group cursor-grab rounded-lg border border-[var(--hq-card-border)] bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-300" />
                        <p className="text-sm font-medium text-[var(--hq-text)]">{card.title}</p>
                      </div>
                      <button
                        onClick={() => removeCard(card.id)}
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-[var(--hq-accent)]">
                      {clientOf(card)}
                    </p>
                    {card.notes && (
                      <p className="mt-1 text-xs text-[var(--hq-text-muted)]">{card.notes}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STAGES.filter((s) => s.key !== card.stage).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => moveCard(card.id, s.key)}
                          className="rounded border border-[var(--hq-card-border)] px-1.5 py-0.5 text-[10px] text-[var(--hq-text-muted)] hover:border-[var(--hq-accent)] hover:text-[var(--hq-accent)]"
                        >
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {stageCards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--hq-card-border)] p-4 text-center text-xs text-[var(--hq-text-muted)]">
                    Nothing here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
