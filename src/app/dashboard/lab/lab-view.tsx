"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2, Megaphone, FileText, TrendingUp, ExternalLink } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Entry = {
  id: string;
  kind: "AD" | "SCRIPT" | "TREND";
  title: string;
  clientId: string | null;
  client: Contact | null;
  platform: string | null;
  sourceUrl: string | null;
  content: string | null;
  breakdown: string | null;
  tags: string[];
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
};

const TABS: { key: Entry["kind"]; label: string; icon: typeof Megaphone; blurb: string }[] = [
  {
    key: "AD",
    label: "Ad Analyzer",
    icon: Megaphone,
    blurb: "Paste a well-performing ad's copy or transcript and note why it works.",
  },
  {
    key: "SCRIPT",
    label: "Script Analyzer",
    icon: FileText,
    blurb: "Break a video script down into hook, structure, and CTA — reusable for client coaching.",
  },
  {
    key: "TREND",
    label: "Trend Log",
    icon: TrendingUp,
    blurb: "Log a trend you're seeing across platforms before it's played out.",
  },
];

const CONTENT_LABEL: Record<Entry["kind"], string> = {
  AD: "Ad copy / transcript",
  SCRIPT: "Script / transcript",
  TREND: "What you're seeing",
};

const BREAKDOWN_LABEL: Record<Entry["kind"], string> = {
  AD: "Why it works / how to use it with clients",
  SCRIPT: "Hook, structure, CTA breakdown",
  TREND: "Why it's working right now",
};

export function LabView({
  initialEntries,
  contacts,
}: {
  initialEntries: Entry[];
  contacts: Contact[];
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [tab, setTab] = useState<Entry["kind"]>("AD");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientId: "",
    platform: "",
    sourceUrl: "",
    content: "",
    breakdown: "",
    tags: "",
  });

  const active = TABS.find((t) => t.key === tab)!;
  const visible = useMemo(() => entries.filter((e) => e.kind === tab), [entries, tab]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: tab,
        title: form.title,
        clientId: form.clientId || undefined,
        platform: form.platform || undefined,
        sourceUrl: form.sourceUrl || undefined,
        content: form.content || undefined,
        breakdown: form.breakdown || undefined,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      }),
    });
    const data = await res.json();
    if (data.entry) setEntries((prev) => [data.entry, ...prev]);
    setForm({ title: "", clientId: "", platform: "", sourceUrl: "", content: "", breakdown: "", tags: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/lab/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--hq-card-border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setShowAdd(false);
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-[var(--hq-accent)] text-[var(--hq-accent)]"
                : "border-transparent text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--hq-text-muted)]">{active.blurb}</p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New {active.label.toLowerCase()} entry</h3>
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
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="">No specific client</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.contactName}
                </option>
              ))}
            </select>
            <input
              placeholder="Platform (IG, TikTok, YouTube…)"
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            />
            <input
              placeholder="Source link (optional)"
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder={CONTENT_LABEL[tab]}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={4}
            />
            <textarea
              placeholder={BREAKDOWN_LABEL[tab]}
              value={form.breakdown}
              onChange={(e) => setForm((f) => ({ ...f, breakdown: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={3}
            />
            <input
              placeholder="Tags, comma separated"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save entry"}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((entry) => (
          <div
            key={entry.id}
            className="group rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-[var(--hq-text)]">{entry.title}</h4>
                <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
                  {[entry.platform, entry.client?.companyName || entry.client?.contactName]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <button
                onClick={() => remove(entry.id)}
                className="opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
              </button>
            </div>
            {entry.content && (
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-[var(--hq-text-muted)]">
                {entry.content}
              </p>
            )}
            {entry.breakdown && (
              <p className="mt-2 rounded-lg bg-[var(--hq-canvas)] p-2 text-xs text-[var(--hq-text)]">
                {entry.breakdown}
              </p>
            )}
            {entry.sourceUrl && (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--hq-accent)]"
              >
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {entry.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-[var(--hq-canvas)] px-1.5 py-0.5 text-[10px] text-[var(--hq-text-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            Nothing logged here yet.
          </div>
        )}
      </div>
    </div>
  );
}
