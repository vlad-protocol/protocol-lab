"use client";

import { useState } from "react";
import { InboxList } from "./inbox-list";

export function MailTabs({ connected, sentFeed }: { connected: boolean; sentFeed: React.ReactNode }) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-[var(--hq-card-border)]">
        <button
          onClick={() => setTab("inbox")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "inbox"
              ? "border-b-2 border-[var(--hq-accent)] text-[var(--hq-text)]"
              : "text-[var(--hq-text-muted)]"
          }`}
        >
          Inbox
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "sent"
              ? "border-b-2 border-[var(--hq-accent)] text-[var(--hq-text)]"
              : "text-[var(--hq-text-muted)]"
          }`}
        >
          Sent (CRM log)
        </button>
      </div>

      {tab === "inbox" ? <InboxList connected={connected} /> : <div className="mt-4 space-y-2">{sentFeed}</div>}
    </div>
  );
}
