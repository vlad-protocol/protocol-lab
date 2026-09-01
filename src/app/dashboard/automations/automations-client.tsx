"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trash2 } from "lucide-react";

type Automation = {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: unknown;
  actionType: string;
  actionConfig: unknown;
  enabled: boolean;
  lastRunAt: string | null;
  createdBy: { name: string | null; email: string } | null;
};

const TRIGGER_LABEL: Record<string, string> = {
  NEW_CONTACT: "New contact added",
  TAG_ADDED: "Contact has tag",
  NO_REPLY_DAYS: "No reply after N days",
  MANUAL: "Manual / all contacts",
};
const ACTION_LABEL: Record<string, string> = {
  SEND_EMAIL: "Send email",
  ADD_TAG: "Add tag",
  LOG_NOTE: "Log a note",
};

export function AutomationsClient({ initialAutomations }: { initialAutomations: Automation[] }) {
  const router = useRouter();
  const [automations, setAutomations] = useState(initialAutomations);
  const [showForm, setShowForm] = useState(false);
  const [runResult, setRunResult] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    triggerType: "NEW_CONTACT",
    triggerTag: "",
    triggerDays: "3",
    actionType: "LOG_NOTE",
    actionTag: "",
    actionSubject: "",
    actionBody: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const triggerConfig =
      form.triggerType === "TAG_ADDED"
        ? { tag: form.triggerTag }
        : form.triggerType === "NO_REPLY_DAYS"
        ? { days: Number(form.triggerDays) }
        : form.triggerType === "MANUAL"
        ? { tag: form.triggerTag || undefined }
        : {};
    const actionConfig =
      form.actionType === "ADD_TAG"
        ? { tag: form.actionTag }
        : form.actionType === "SEND_EMAIL"
        ? { subject: form.actionSubject, body: form.actionBody }
        : { note: form.actionBody };

    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        triggerType: form.triggerType,
        triggerConfig,
        actionType: form.actionType,
        actionConfig,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ ...form, name: "", triggerTag: "", actionTag: "", actionSubject: "", actionBody: "" });
      router.refresh();
      const { automation } = await res.json();
      setAutomations((a) => [
        { ...automation, createdAt: automation.createdAt, lastRunAt: null, createdBy: null },
        ...a,
      ]);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setAutomations((a) => a.map((x) => (x.id === id ? { ...x, enabled } : x)));
  }

  async function remove(id: string) {
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    setAutomations((a) => a.filter((x) => x.id !== id));
  }

  async function run(id: string) {
    setRunResult((r) => ({ ...r, [id]: "Running…" }));
    const res = await fetch(`/api/automations/${id}/run`, { method: "POST" });
    const d = await res.json();
    setRunResult((r) => ({
      ...r,
      [id]: res.ok
        ? `Matched ${d.matched}, applied ${d.applied}, skipped ${d.skipped}${d.errors?.length ? `, ${d.errors.length} error(s)` : ""}`
        : d.error || "Failed",
    }));
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowForm((s) => !s)}
        className="rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
      >
        {showForm ? "Close" : "New automation"}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 space-y-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
          <input
            required
            placeholder="Name (e.g. Tag hot leads that ghosted)"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--hq-text-muted)]">When…</label>
              <select
                className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
              >
                {Object.entries(TRIGGER_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {form.triggerType === "TAG_ADDED" && (
                <input
                  placeholder="tag"
                  className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.triggerTag}
                  onChange={(e) => setForm({ ...form, triggerTag: e.target.value })}
                />
              )}
              {form.triggerType === "NO_REPLY_DAYS" && (
                <input
                  type="number"
                  placeholder="days"
                  className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.triggerDays}
                  onChange={(e) => setForm({ ...form, triggerDays: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className="block text-xs text-[var(--hq-text-muted)]">Then…</label>
              <select
                className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value })}
              >
                {Object.entries(ACTION_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {form.actionType === "ADD_TAG" && (
                <input
                  placeholder="tag to add"
                  className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.actionTag}
                  onChange={(e) => setForm({ ...form, actionTag: e.target.value })}
                />
              )}
              {form.actionType === "SEND_EMAIL" && (
                <input
                  placeholder="subject ({{contactName}}, {{companyName}})"
                  className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.actionSubject}
                  onChange={(e) => setForm({ ...form, actionSubject: e.target.value })}
                />
              )}
              {(form.actionType === "SEND_EMAIL" || form.actionType === "LOG_NOTE") && (
                <textarea
                  placeholder="body"
                  rows={2}
                  className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={form.actionBody}
                  onChange={(e) => setForm({ ...form, actionBody: e.target.value })}
                />
              )}
            </div>
          </div>
          <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Create automation
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {automations.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">No automations yet.</p>
        )}
        {automations.map((a) => (
          <div key={a.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--hq-text)]">{a.name}</p>
                <p className="text-xs text-[var(--hq-text-muted)]">
                  {TRIGGER_LABEL[a.triggerType]} → {ACTION_LABEL[a.actionType]}
                  {a.lastRunAt && ` · last run ${new Date(a.lastRunAt).toLocaleString()}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) => toggle(a.id, e.target.checked)}
                  />
                  Enabled
                </label>
                <button
                  onClick={() => run(a.id)}
                  className="flex items-center gap-1 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-xs font-medium text-[var(--hq-text)]"
                >
                  <Play className="h-3 w-3" /> Run now
                </button>
                <button onClick={() => remove(a.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {runResult[a.id] && (
              <p className="mt-2 text-xs text-[var(--hq-text-muted)]">{runResult[a.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
