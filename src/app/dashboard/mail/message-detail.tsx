"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Reply, ReplyAll, Forward } from "lucide-react";

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

function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return headerValue.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  function subjectWithPrefix(subject: string, prefix: string) {
    return subject.toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--hq-card-border)] p-4">
          <p className="text-sm font-semibold text-[var(--hq-text)]">
            {message?.subject || (loading ? "Loading..." : "(no subject)")}
          </p>
          <button onClick={onClose} className="text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-[var(--hq-text-muted)]">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {message && (
            <>
              <div className="mb-3 space-y-0.5 text-xs text-[var(--hq-text-muted)]">
                <p>
                  From <span className="font-medium text-[var(--hq-text)]">{message.from}</span>
                  {contact && (
                    <>
                      {" "}
                      · matched to{" "}
                      <span className="font-medium text-[var(--hq-accent)]">
                        {contact.contactName}
                        {contact.companyName ? ` · ${contact.companyName}` : ""}
                      </span>
                    </>
                  )}
                </p>
                <p>To {message.to}</p>
                {message.cc && <p>Cc {message.cc}</p>}
                <p>{new Date(message.date).toLocaleString()}</p>
              </div>

              {message.html ? (
                <iframe
                  title="Email body"
                  sandbox=""
                  srcDoc={message.html}
                  className="h-[45vh] w-full rounded-md border border-[var(--hq-card-border)] bg-white"
                />
              ) : (
                <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-md border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-3 text-sm text-[var(--hq-text)]">
                  {message.text || "(empty message)"}
                </pre>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openReply("reply")}
                  className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)]"
                >
                  <Reply className="h-3.5 w-3.5" /> Reply
                </button>
                <button
                  onClick={() => openReply("replyAll")}
                  className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)]"
                >
                  <ReplyAll className="h-3.5 w-3.5" /> Reply all
                </button>
                <button
                  onClick={() => openReply("forward")}
                  className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)]"
                >
                  <Forward className="h-3.5 w-3.5" /> Forward
                </button>
              </div>

              {sent && !replyMode && <p className="mt-2 text-sm text-[var(--hq-positive)]">Sent.</p>}

              {replyMode && (
                <form onSubmit={submitReply} className="mt-3 space-y-2 rounded-md border border-[var(--hq-card-border)] p-3">
                  {sendError && <p className="text-sm text-red-600">{sendError}</p>}
                  <input
                    required
                    type="email"
                    placeholder="To"
                    className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                  />
                  {replyMode === "replyAll" && (
                    <input
                      placeholder="Cc"
                      className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                      value={form.cc}
                      onChange={(e) => setForm({ ...form, cc: e.target.value })}
                    />
                  )}
                  <input
                    required
                    placeholder="Subject"
                    className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                  <textarea
                    required
                    rows={8}
                    className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={submitting}
                      className="rounded-md bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {submitting ? "Sending..." : "Send"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyMode(null)}
                      className="rounded-md px-3 py-2 text-sm font-medium text-[var(--hq-text-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
