"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InstagramConnectCard({
  configured,
  connected,
  username,
}: {
  configured: boolean;
  connected: boolean;
  username: string | null;
}) {
  const router = useRouter();
  const [igUserId, setIgUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    await fetch("/api/integrations/instagram/status", { method: "DELETE" });
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
        body: JSON.stringify({ igUserId, accessToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't verify that token.");
      setAccessToken("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify that token.");
    } finally {
      setSubmitting(false);
    }
  }

  if (connected) {
    return (
      <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <p className="text-sm text-[var(--hq-text)]">
          Connected — reading Reels from <span className="font-medium">@{username}</span>.
        </p>
        <button onClick={disconnect} className="text-xs text-[var(--hq-text-muted)] hover:text-red-600">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        Connect your Protocol Instagram account so Reels, captions, and engagement sync in
        automatically, and so posts can be published from here.
      </p>

      <form onSubmit={connectManually} className="mt-3 space-y-2">
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
        Never expires, so this only needs doing once.
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
