"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2, Search } from "lucide-react";

type Entry = {
  id: string;
  type: "LEARNING" | "THOUGHT" | "NOTE";
  category:
    | "PERSONAL"
    | "BUSINESS"
    | "MARKETING"
    | "EVENTS"
    | "FITNESS"
    | "PHILOSOPHY"
    | "CREATIVITY"
    | "RELATIONSHIPS"
    | "OTHER";
  source: string | null;
  content: string;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
};

const TYPES: { key: Entry["type"]; label: string }[] = [
  { key: "LEARNING", label: "Learning" },
  { key: "THOUGHT", label: "Thought" },
  { key: "NOTE", label: "Note" },
];

const CATEGORIES: Entry["category"][] = [
  "PERSONAL",
  "BUSINESS",
  "MARKETING",
  "EVENTS",
  "FITNESS",
  "PHILOSOPHY",
  "CREATIVITY",
  "RELATIONSHIPS",
  "OTHER",
];

function cap(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function BrainView({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [typeFilter, setTypeFilter] = useState<Entry["type"] | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<Entry["category"] | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [form, setForm] = useState<{
    type: Entry["type"];
    category: Entry["category"];
    source: string;
    content: string;
  }>({ type: "THOUGHT", category: "OTHER", source: "", content: "" });

  const visible = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
      if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false;
      if (query && !e.content.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [entries, typeFilter, categoryFilter, query]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        category: form.category,
        source: form.type === "LEARNING" ? form.source || undefined : undefined,
        content: form.content,
      }),
    });
    const data = await res.json();
    if (data.entry) {
      setEntries((prev) => [data.entry, ...prev]);
      setLastSaved(`Saved → ${cap(form.type)} / Category: ${cap(form.category)}`);
    }
    setForm({ type: "THOUGHT", category: "OTHER", source: "", content: "" });
    setSubmitting(false);
  }

  async function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/brain/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t.key }))}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                form.type === t.key
                  ? "bg-[var(--hq-accent)] text-white"
                  : "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Entry["category"] }))}
            className="ml-auto rounded-lg border border-[var(--hq-card-border)] px-2 py-1 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {cap(c)}
              </option>
            ))}
          </select>
        </div>

        {form.type === "LEARNING" && (
          <input
            placeholder="Source — book, podcast, person"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            className="mt-3 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        )}

        <textarea
          required
          placeholder={
            form.type === "LEARNING"
              ? "What did you learn — in your own words"
              : form.type === "THOUGHT"
              ? "What's on your mind"
              : "Quick note"
          }
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          className="mt-3 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          rows={3}
        />

        <div className="mt-3 flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {submitting ? "Saving…" : "Capture"}
          </button>
          {lastSaved && <span className="text-xs text-[var(--hq-text-muted)]">{lastSaved}</span>}
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--hq-card-border)] bg-white px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
          <input
            placeholder="Search your brain…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-48 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X className="h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as Entry["type"] | "ALL")}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2 py-1.5 text-sm"
        >
          <option value="ALL">All types</option>
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Entry["category"] | "ALL")}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2 py-1.5 text-sm"
        >
          <option value="ALL">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {cap(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {visible.map((entry) => (
          <div
            key={entry.id}
            className="group rounded-xl border border-[var(--hq-card-border)] bg-white p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-[var(--hq-accent-soft,#f2eee8)] px-2 py-0.5 font-medium text-[var(--hq-accent)]">
                  {cap(entry.type)}
                </span>
                <span className="text-[var(--hq-text-muted)]">{cap(entry.category)}</span>
                {entry.source && (
                  <span className="text-[var(--hq-text-muted)]">· {entry.source}</span>
                )}
              </div>
              <button
                onClick={() => remove(entry.id)}
                className="opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--hq-text)]">{entry.content}</p>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            Nothing here yet.
          </div>
        )}
      </div>
    </div>
  );
}
