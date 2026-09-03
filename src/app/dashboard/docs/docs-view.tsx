"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2, Send, Link as LinkIcon, Check } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Doc = {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "SIGNED";
  contactId: string | null;
  contact: Contact | null;
  signerName: string | null;
  signerEmail: string | null;
  signedAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SENT: "bg-amber-50 text-amber-700",
  SIGNED: "bg-emerald-50 text-emerald-700",
};

export function DocsView({ initialDocs, contacts }: { initialDocs: Doc[]; contacts: Contact[] }) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", contactId: "" });

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, contactId: form.contactId || undefined }),
    });
    const data = await res.json();
    if (data.doc) setDocs((prev) => [data.doc, ...prev]);
    setForm({ title: "", content: "", contactId: "" });
    setSubmitting(false);
    setShowAdd(false);
  }

  async function markSent(id: string) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, status: "SENT" } : d)));
    await fetch(`/api/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
  }

  async function remove(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/docs/${id}`, { method: "DELETE" });
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${origin}/sign/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> New doc
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New document</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <input
              required
              placeholder="Title (e.g. 'Content retainer agreement — Sauna Co.')"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            />
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
            <textarea
              required
              placeholder="Document body"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              rows={8}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save draft"}
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {docs.map((doc) => (
          <div key={doc.id} className="group rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-[var(--hq-text)]">{doc.title}</h4>
                <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
                  {doc.contact?.companyName || doc.contact?.contactName || "No contact linked"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[doc.status]}`}>
                  {doc.status}
                </span>
                <button
                  onClick={() => remove(doc.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                </button>
              </div>
            </div>
            {doc.status === "SIGNED" && doc.signerName && (
              <p className="mt-2 text-xs text-emerald-700">
                Signed by {doc.signerName} ({doc.signerEmail}) on{" "}
                {doc.signedAt && new Date(doc.signedAt).toLocaleString()}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {doc.status === "DRAFT" && (
                <button
                  onClick={() => markSent(doc.id)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white"
                >
                  <Send className="h-3 w-3" /> Mark sent
                </button>
              )}
              {doc.status !== "DRAFT" && (
                <button
                  onClick={() => copyLink(doc.id)}
                  className="flex items-center gap-1 rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1 text-xs font-medium text-[var(--hq-text)]"
                >
                  {copiedId === doc.id ? <Check className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                  {copiedId === doc.id ? "Copied" : "Copy signing link"}
                </button>
              )}
            </div>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            No documents yet.
          </div>
        )}
      </div>
    </div>
  );
}
