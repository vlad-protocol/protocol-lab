"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Reply, ReplyAll, Forward, Send } from "lucide-react";
import {
  extractEmail,
  parseAddress,
  initials,
  avatarColorClass,
  stripHtml,
  subjectWithPrefix,
  formatMessageDate,
} from "@/lib/email-view-helpers";

type FullMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  messageIdHeader: string;
  references: string;
  html: string | null;
  text: string | null;
  unread: boolean;
};

type ReplyMode = "reply" | "replyAll" | "forward" | null;

export function MessageDetail({
  messageId,
  onClose,
  onRead,
}: {
  messageId: string;
  onClose: () => void;
  onRead: (id: string) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<FullMessage | null>(null);
  const [contact, setContact] = useState<{ id: string; contactName: string; companyName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyMode, setReplyMode] = useState<ReplyMode>(null);
  const [form, setForm] = useState({ to: "", cc: "", subject: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setReplyMode(null);
    setSent(false);
    fetch(`/api/mail/inbox/${messageId}`)
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Failed to load message.");
        return d;
      })
      .then((d) => {
        setMessage(d.message);
        setContact(d.contact || null);
        if (d.message?.unread) onRead(messageId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load message."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  function openReply(mode: ReplyMode) {
    if (!message) return;
    const quoted = message.text || (message.html ? stripHtml(message.html) : "");
    const quoteBlock = quoted ? `\n\nOn ${message.date}, ${message.from} wrote:\n> ${quoted.replace(/\n/g, "\n> ")}` : "";

    if (mode === "reply") {
      setForm({ to: extractEmail(message.from), cc: "", subject: subjectWithPrefix(message.subject, "Re:"), body: quoteBlock });
    } else if (mode === "replyAll") {
      const others = (message.to + (message.cc ? `, ${message.cc}` : ""))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setForm({
        to: extractEmail(message.from),
        cc: others.join(", "),
        subject: subjectWithPrefix(message.subject, "Re:"),
        body: quoteBlock,
      });
    } else if (mode === "forward") {
      setForm({
        to: "",
        cc: "",
        subject: subjectWithPrefix(message.subject, "Fwd:"),
        body: `\n\n---------- Forwarded message ----------\nFrom: ${message.from}\nDate: ${message.date}\nSubject: ${message.subject}\nTo: ${message.to}\n\n${quoted}`,
      });
    }
    setSendError(null);
    setSent(false);
    setReplyMode(mode);
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message) return;
    setSubmitting(true);
    setSendError(null);
    const res = await fetch("/api/mail/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: form.to,
        cc: form.cc || undefined,
        subject: form.subject,
        text: form.body,
        threadId: replyMode === "forward" ? undefined : message.threadId,
        inReplyTo: replyMode === "forward" ? undefined : message.messageIdHeader,
        references: replyMode === "forward" ? undefined : [message.references, message.messageIdHeader].filter(Boolean).join(" "),
      }),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSendError(d.error || "Something went wrong.");
      return;
    }
    setSent(true);
    setReplyMode(null);
    router.refresh();
  }

  const sender = message ? parseAddress(message.from) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--hq-card-border)] px-5 py-4">
          <p className="truncate pr-4 text-base font-semibold text-[var(--hq-text)]">
            {message?.subject || (loading ? "Loading…" : "(no subject)")}
          </p>
          <button onClick={onClose} className="shrink-0 rounded-full p-1 text-[var(--hq-text-muted)] hover:bg-black/5 hover:text-[var(--hq-text)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-5 text-sm text-[var(--hq-text-muted)]">Loading…</p>}
          {error && <p className="p-5 text-sm text-red-600">{error}</p>}

          {message && sender && (
            <>
              <div className="flex items-start gap-3 px-5 pt-4 pb-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColorClass(sender.email)}`}
                >
                  {initials(sender.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm">
                      <span className="font-semibold text-[var(--hq-text)]">{sender.name}</span>
                      {sender.name !== sender.email && (
                        <span className="ml-1.5 text-[var(--hq-text-muted)]">&lt;{sender.email}&gt;</span>
                      )}
                      {contact && (
                        <span className="ml-2 rounded-full bg-[var(--hq-accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--hq-accent)]">
                          {contact.contactName}
                          {contact.companyName ? ` · ${contact.companyName}` : ""}
                        </span>
                      )}
                    </p>
                    <span className="shrink-0 text-xs text-[var(--hq-text-muted)]">{formatMessageDate(message.date)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--hq-text-muted)]">to {message.to}</p>
                  {message.cc && <p className="truncate text-xs text-[var(--hq-text-muted)]">cc {message.cc}</p>}
                </div>
              </div>

              <div className="px-5 pb-5">
                {message.html ? (
                  <iframe
                    title="Email body"
                    sandbox=""
                    srcDoc={message.html}
                    className="h-[48vh] w-full rounded-lg border border-[var(--hq-card-border)] bg-white"
                  />
                ) : (
                  <pre className="max-h-[48vh] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-4 text-sm text-[var(--hq-text)]">
                    {message.text || "(empty message)"}
                  </pre>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openReply("reply")}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--hq-card-border)] px-4 py-2 text-sm font-medium text-[var(--hq-text)] hover:bg-black/5"
                  >
                    <Reply className="h-4 w-4" /> Reply
                  </button>
                  <button
                    onClick={() => openReply("replyAll")}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--hq-card-border)] px-4 py-2 text-sm font-medium text-[var(--hq-text)] hover:bg-black/5"
                  >
                    <ReplyAll className="h-4 w-4" /> Reply all
                  </button>
                  <button
                    onClick={() => openReply("forward")}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--hq-card-border)] px-4 py-2 text-sm font-medium text-[var(--hq-text)] hover:bg-black/5"
                  >
                    <Forward className="h-4 w-4" /> Forward
                  </button>
                </div>

                {sent && !replyMode && <p className="mt-3 text-sm text-[var(--hq-positive)]">Sent.</p>}

                {replyMode && (
                  <form onSubmit={submitReply} className="mt-4 space-y-2.5 rounded-xl border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-4">
                    {sendError && <p className="text-sm text-red-600">{sendError}</p>}
                    <input
                      required
                      type="email"
                      placeholder="To"
                      className="w-full rounded-md border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
                      value={form.to}
                      onChange={(e) => setForm({ ...form, to: e.target.value })}
                    />
                    {replyMode === "replyAll" && (
                      <input
                        placeholder="Cc"
                        className="w-full rounded-md border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
                        value={form.cc}
                        onChange={(e) => setForm({ ...form, cc: e.target.value })}
                      />
                    )}
                    <input
                      required
                      placeholder="Subject"
                      className="w-full rounded-md border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                    <textarea
                      required
                      rows={9}
                      className="w-full rounded-md border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={submitting}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> {submitting ? "Sending…" : "Send"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMode(null)}
                        className="rounded-full px-4 py-2 text-sm font-medium text-[var(--hq-text-muted)] hover:bg-black/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
