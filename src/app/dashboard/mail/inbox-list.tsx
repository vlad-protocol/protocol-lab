"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { MessageDetail } from "./message-detail";

type InboxMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
  contact: { id: string; contactName: string; companyName: string | null } | null;
};

export function InboxList({
  connected,
  onUnreadCountChange,
}: {
  connected: boolean;
  onUnreadCountChange?: (count: number) => void;
}) {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/mail/inbox");
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error || "Failed to load inbox.");
      return;
    }
    setMessages(d.messages || []);
  }

  useEffect(() => {
    if (connected) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    onUnreadCountChange?.(messages ? messages.filter((m) => m.unread).length : 0);
  }, [messages, onUnreadCountChange]);

  function markRead(id: string) {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, unread: false } : m)) : prev));
  }

  if (!connected) {
    return (
      <p className="mt-4 text-sm text-[var(--hq-text-muted)]">
        Connect Gmail above to see your inbox here.
      </p>
    );
  }

  const unreadCount = messages ? messages.filter((m) => m.unread).length : 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--hq-text-muted)]">
          Your live Gmail inbox — most recent 25 messages.
          {unreadCount > 0 && (
            <span className="ml-1.5 font-semibold text-[var(--hq-accent)]">
              {unreadCount} unread.
            </span>
          )}{" "}
          Click one to read, reply, or forward.
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-accent)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {loading && !messages && (
        <p className="mt-2 text-sm text-[var(--hq-text-muted)]">Loading inbox...</p>
      )}
      {messages && messages.length === 0 && !error && (
        <p className="mt-2 text-sm text-[var(--hq-text-muted)]">Your inbox is empty.</p>
      )}

      <div className="mt-2 space-y-2">
        {messages?.map((m) => (
          <button
            key={m.id}
            onClick={() => setOpenId(m.id)}
            className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left ${
              m.unread
                ? "border-[var(--hq-accent)] bg-[var(--hq-accent-soft)] hover:border-[var(--hq-accent)]"
                : "border-[var(--hq-card-border)] bg-white hover:border-[var(--hq-accent)]"
            }`}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                m.unread ? "bg-[var(--hq-accent)]" : "bg-transparent"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate text-sm ${m.unread ? "font-bold" : "font-medium"} text-[var(--hq-text)]`}>
                  {m.subject || "(no subject)"}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {m.unread && (
                    <span className="rounded-full bg-[var(--hq-accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                  <p className="text-xs text-[var(--hq-text-muted)]">
                    {m.date ? new Date(m.date).toLocaleString() : ""}
                  </p>
                </div>
              </div>
              <p className={`text-xs ${m.unread ? "font-semibold text-[var(--hq-text)]" : "text-[var(--hq-text-muted)]"}`}>
                From {m.from}
                {m.contact && (
                  <>
                    {" "}
                    · matched to{" "}
                    <span className="font-medium text-[var(--hq-accent)]">
                      {m.contact.contactName}
                      {m.contact.companyName ? ` · ${m.contact.companyName}` : ""}
                    </span>
                  </>
                )}
              </p>
              {m.snippet && (
                <p
                  className={`mt-1 line-clamp-2 text-sm ${
                    m.unread ? "text-[var(--hq-text)]" : "text-[var(--hq-text-muted)]"
                  }`}
                >
                  {m.snippet}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {openId && (
        <MessageDetail messageId={openId} onClose={() => setOpenId(null)} onRead={markRead} />
      )}
    </div>
  );
}
