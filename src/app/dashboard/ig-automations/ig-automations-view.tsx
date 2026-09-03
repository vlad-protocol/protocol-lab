"use client";

import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";

type Automation = {
  id: string;
  name: string;
  trigger: "COMMENT_KEYWORD" | "DM_KEYWORD" | "NEW_FOLLOWER";
  keyword: string | null;
  replyText: string | null;
  enabled: boolean;
};

const TRIGGER_LABEL: Record<Automation["trigger"], string> = {
  COMMENT_KEYWORD: "Comment contains keyword",
  DM_KEYWORD: "DM contains keyword",
  NEW_FOLLOWER: "New follower",
};

export function IGAutomationsView({ initialAutomations }: { initialAutomations: Automation[] }) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger: "COMMENT_KEYWORD" as Automation["trigger"],
    keyword: "",
    replyText: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/ig-automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.automation) setAutomations((prev) => [data.automation, ...prev]);
    setForm({ name: "", trigger: "COMMENT_KEYWORD", keyword: "", replyText: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function toggle(id: string, enabled: boolean) {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    await fetch(`/api/ig-automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  async function remove(id: string) {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/ig-automations/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> New rule
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New automation rule</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.trigger}
              onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value as Automation["trigger"] }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              {Object.entries(TRIGGER_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            {form.trigger !== "NEW_FOLLOWER" && (
              <input
                placeholder="Keyword"
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              />
            )}
            <textarea
              placeholder="Reply text"
              value={form.replyText}
              onChange={(e) => setForm((f) => ({ ...f, replyText: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save rule"}
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {automations.map((a) => (
          <div
            key={a.id}
            className="group flex items-start justify-between gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-3.5"
          >
            <div>
              <p className="text-sm font-medium text-[var(--hq-text)]">{a.name}</p>
              <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
                {TRIGGER_LABEL[a.trigger]}
                {a.keyword ? ` "${a.keyword}"` : ""} → {a.replyText || "no reply set"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => toggle(a.id, e.target.checked)}
                  className="accent-[var(--hq-accent)]"
                />
                {a.enabled ? "On" : "Off"}
              </label>
              <button
                onClick={() => remove(a.id)}
                className="opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {automations.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            No rules yet.
          </div>
        )}
      </div>
    </div>
  );
}
