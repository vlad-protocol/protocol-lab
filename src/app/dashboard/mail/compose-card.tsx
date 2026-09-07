"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export function ComposeCard({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ to: "", subject: "", body: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSent(false);
    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: form.to,
        subject: form.subject,
        text: form.body,
      }),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Something went wrong.");
      return;
    }
    setForm({ to: "", subject: "", body: "" });
    setSent(true);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white"
      >
        <Send className="h-3.5 w-3.5" /> Compose
      </button>

      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          {!connected && (
            <p className="text-xs text-[var(--hq-text-muted)]">
              Gmail isn&apos;t connected — connect it above to actually deliver this. It&apos;ll
              still be logged and matched to a contact.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {sent && !error && <p className="text-sm text-[var(--hq-positive)]">Sent.</p>}
          <input
            required
            type="email"
            placeholder="To (email address)"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
          <input
            required
            placeholder="Subject"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <textarea
            required
            rows={5}
            placeholder="Write your message..."
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <button
            disabled={submitting}
            className="rounded-md bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send"}
          </button>
          <p className="text-xs text-[var(--hq-text-muted)]">
            If &quot;{form.to || "this address"}&quot; doesn&apos;t match an existing contact,
            a new lead is created automatically so it shows up in the CRM.
          </p>
        </form>
      )}
    </div>
  );
}
