"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Archive, Trash2, Star, MailOpen, Mail as MailIcon } from "lucide-react";
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
  starred: boolean;
  contact: { id: string; contactName: string; companyName: string | null } | null;
};

type BulkAction = "markRead" | "markUnread" | "archive" | "trash" | "star" | "unstar";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

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
    setSelected(new Set());
  }

  useEffect(() => {
    if (connected) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    onUnreadCountChange?.(messages ? messages.filter((m) => m.unread).length : 0);
  }, [messages, onUnreadCountChange]);

  useEffect(() => {
    if (!selectAllRef.current || !messages) return;
    selectAllRef.current.indeterminate = selected.size > 0 && selected.size < messages.length;
  }, [selected, messages]);

  function markRead(id: string) {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, unread: false } : m)) : prev));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!messages) return;
    setSelected((prev) => (prev.size === messages.length ? new Set() : new Set(messages.map((m) => m.id))));
  }

  async function runBulk(action: BulkAction) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBulkBusy(true);
    setError(null);
    const res = await fetch("/api/mail/inbox/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    setBulkBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "That action failed.");
      return;
    }

    // Mirror Gmail: archive/trash remove the rows from view immediately
    // (they've left the inbox), everything else just updates the row.
    if (action === "archive" || action === "trash") {
      setMessages((prev) => (prev ? prev.filter((m) => !selected.has(m.id)) : prev));
    } else {
      setMessages((prev) =>
        prev
          ? prev.map((m) => {
              if (!selected.has(m.id)) return m;
              if (action === "markRead") return { ...m, unread: false };
              if (action === "markUnread") return { ...m, unread: true };
              if (action === "star") return { ...m, starred: true };
              if (action === "unstar") return { ...m, starred: false };
              return m;
            })
          : prev
      );
    }
    setSelected(new Set());
  }

  async function toggleStar(id: string, starred: boolean) {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, starred } : m)) : prev));
    const res = await fetch("/api/mail/inbox/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], action: starred ? "star" : "unstar" }),
    });
    if (!res.ok) {
      // revert on failure
      setMessages((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, starred: !starred } : m)) : prev));
    }
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

      {messages && messages.length > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={selected.size > 0 && selected.size === messages.length}
            onChange={toggleAll}
            className="h-4 w-4"
            aria-label="Select all"
          />
          {selected.size === 0 ? (
            <span className="text-xs text-[var(--hq-text-muted)]">Select messages to act on several at once</span>
          ) : (
            <>
              <span className="text-xs font-medium text-[var(--hq-text)]">{selected.size} selected</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => runBulk("markRead")}
                  disabled={bulkBusy}
                  title="Mark as read"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)] hover:text-[var(--hq-text)] disabled:opacity-50"
                >
                  <MailOpen className="h-3.5 w-3.5" /> Read
                </button>
                <button
                  onClick={() => runBulk("markUnread")}
                  disabled={bulkBusy}
                  title="Mark as unread"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)] hover:text-[var(--hq-text)] disabled:opacity-50"
                >
                  <MailIcon className="h-3.5 w-3.5" /> Unread
                </button>
                <button
                  onClick={() => runBulk("star")}
                  disabled={bulkBusy}
                  title="Star"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)] hover:text-[var(--hq-text)] disabled:opacity-50"
                >
                  <Star className="h-3.5 w-3.5" /> Star
                </button>
                <button
                  onClick={() => runBulk("unstar")}
                  disabled={bulkBusy}
                  title="Remove star"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)] hover:text-[var(--hq-text)] disabled:opacity-50"
                >
                  <Star className="h-3.5 w-3.5" /> Unstar
                </button>
                <button
                  onClick={() => runBulk("archive")}
                  disabled={bulkBusy}
                  title="Archive"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)] hover:text-[var(--hq-text)] disabled:opacity-50"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
                <button
                  onClick={() => runBulk("trash")}
                  disabled={bulkBusy}
                  title="Delete"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-2 space-y-2">
        {messages?.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2 rounded-xl border p-4 ${
              m.unread
                ? "border-[var(--hq-accent)] bg-[var(--hq-accent-soft)]"
                : "border-[var(--hq-card-border)] bg-white"
            } ${selected.has(m.id) ? "ring-2 ring-[var(--hq-accent)]" : ""}`}
          >
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              onChange={() => toggleOne(m.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 h-4 w-4 shrink-0"
              aria-label="Select message"
            />
            <button
              onClick={() => toggleStar(m.id, !m.starred)}
              title={m.starred ? "Remove star" : "Star"}
              className="mt-1 shrink-0 text-[var(--hq-text-muted)] hover:text-amber-500"
            >
              <Star className={`h-4 w-4 ${m.starred ? "fill-amber-400 text-amber-500" : ""}`} />
            </button>
            <button onClick={() => setOpenId(m.id)} className="min-w-0 flex-1 text-left">
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
            </button>
          </div>
        ))}
      </div>

      {openId && (
        <MessageDetail messageId={openId} onClose={() => setOpenId(null)} onRead={markRead} />
      )}
    </div>
  );
}
