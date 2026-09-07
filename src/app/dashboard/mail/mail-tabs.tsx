"use client";

import { useCallback, useState } from "react";
import { InboxList } from "./inbox-list";

export function MailTabs({ connected, sentFeed }: { connected: boolean; sentFeed: React.ReactNode }) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [unreadCount, setUnreadCount] = useState(0);
  const handleUnreadCountChange = useCallback((count: number) => setUnreadCount(count), []);

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-[var(--hq-card-border)]">
        <button
          onClick={() => setTab("inbox")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
            tab === "inbox"
              ? "border-b-2 border-[var(--hq-accent)] text-[var(--hq-text)]"
              : "text-[var(--hq-text-muted)]"
          }`}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--hq-accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          )}
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

      <div className={tab === "inbox" ? "" : "hidden"}>
        <InboxList connected={connected} onUnreadCountChange={handleUnreadCountChange} />
      </div>
      {tab === "sent" && <div className="mt-4 space-y-2">{sentFeed}</div>}
    </div>
  );
}
