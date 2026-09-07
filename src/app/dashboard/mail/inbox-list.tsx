"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

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

export function InboxList({ connected }: { connected: boolean }) {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!connected) {
    return (
      <p className="mt-4 text-sm text-[var(--hq-text-muted)]">
        Connect Gmail above to see your inbox here.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--hq-text-muted)]">
          Your live Gmail inbox — most recent 25 messages.
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
        {messages?.map((m) => {
          const body = (
            <div
              className={`rounded-xl border border-[var(--hq-card-border)] bg-white p-4 ${
                m.contact ? "hover:border-[var(--hq-accent)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate text-sm ${m.unread ? "font-semibold" : "font-medium"} text-[var(--hq-text)]`}>
                  {m.subject || "(no subject)"}
                </p>
                <p className="shrink-0 text-xs text-[var(--hq-text-muted)]">
                  {m.date ? new Date(m.date).toLocaleString() : ""}
                </p>
              </div>
              <p className="text-xs text-[var(--hq-text-muted)]">
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
                <p className="mt-1 line-clamp-2 text-sm text-[var(--hq-text-muted)]">{m.snippet}</p>
              )}
            </div>
          );
          return m.contact ? (
            <Link key={m.id} href={`/dashboard/people/${m.contact.id}`} className="block">
              {body}
            </Link>
          ) : (
            <div key={m.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
