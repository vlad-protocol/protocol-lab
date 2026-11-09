"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  igUserId: string;
  username: string | null;
  label: string | null;
  connectedAt: string;
};

export function InstagramConnectCard({
  configured,
  accounts,
}: {
  configured: boolean;
  accounts: Account[];
}) {
  const router = useRouter();
  const [igUserId, setIgUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  async function disconnect(id: string) {
    setDisconnectingId(id);
    await fetch(`/api/integrations/instagram/accounts/${id}`, { method: "DELETE" });
    setDisconnectingId(null);
    router.refresh();
  }

  async function connectManually(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/instagram/manual-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igUserId, accessToken, label }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't verify that token.");
      setIgUserId("");
      setAccessToken("");
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify that token.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        Connect as many Instagram accounts as you need — each syncs Reels/engagement into
        Content Performance separately, and you pick which one to publish to from the Content
        Engine calendar.
      </p>

      {accounts.length > 0 && (
        <div className="mt-3 space-y-2">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-[var(--hq-card-border)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-[var(--hq-text)]">
                  {a.label || (a.username ? `@${a.username}` : a.igUserId)}
                </p>
                {a.label && a.username && (
                  <p className="text-[11px] text-[var(--hq-text-muted)]">@{a.username}</p>
                )}
              </div>
              <button
                onClick={() => disconnect(a.id)}
                disabled={disconnectingId === a.id}
                className="text-xs text-[var(--hq-text-muted)] hover:text-red-600 disabled:opacity-50"
              >
                {disconnectingId === a.id ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={connectManually} className="mt-3 space-y-2">
        <p className="text-xs font-medium text-[var(--hq-text)]">
          {accounts.length > 0 ? "Connect another account" : "Connect an account"}
        </p>
        <div>
          <label className="block text-xs font-medium text-[var(--hq-text)]">
            Nickname (optional — helps tell accounts apart)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Protocol brand"
            className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--hq-text)]">
            Instagram Business Account ID
          </label>
          <input
            type="text"
            value={igUserId}
            onChange={(e) => setIgUserId(e.target.value)}
            placeholder="17841401355945446"
            className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--hq-text)]">
            Access token (System User Access Token from Meta&apos;s dashboard)
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAA..."
            className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            required
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Connecting…" : "Connect Instagram"}
        </button>
      </form>

      <p className="mt-3 text-[11px] text-[var(--hq-text-muted)]">
        In Meta&apos;s dashboard: Use cases → Instagram API → API setup with Unified login →
        step 2, &quot;Generate access tokens&quot; → copy the account ID and token shown there.
        Never expires, so each account only needs connecting once.
      </p>

      {configured && (
        <p className="mt-3 border-t border-[var(--hq-card-border)] pt-3 text-[11px] text-[var(--hq-text-muted)]">
          There&apos;s also a{" "}
          <a href="/api/integrations/instagram/connect" className="text-[var(--hq-accent)] hover:underline">
            one-click OAuth connect
          </a>{" "}
          wired up from an older setup, but Meta no longer supports it for newer apps — use the
          manual token above instead unless that one already works for you.
        </p>
      )}
    </div>
  );
}
