"use client";

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

  async function disconnect() {
    await fetch("/api/integrations/instagram/status", { method: "DELETE" });
    router.refresh();
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

  if (!configured) {
    return (
      <div className="mt-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4 text-xs text-[var(--hq-text-muted)]">
        Needs a Meta Developer App first: create one at{" "}
        <a href="https://developers.facebook.com/apps" target="_blank" className="text-[var(--hq-accent)] hover:underline">
          developers.facebook.com/apps
        </a>
        , add the Instagram product, configure &quot;Business Login for Instagram&quot;, and
        connect it to your Instagram professional account. Then set{" "}
        <code className="rounded bg-[var(--hq-canvas)] px-1">IG_APP_ID</code>,{" "}
        <code className="rounded bg-[var(--hq-canvas)] px-1">IG_APP_SECRET</code>, and{" "}
        <code className="rounded bg-[var(--hq-canvas)] px-1">IG_REDIRECT_URI</code> (this
        site&apos;s URL + <code className="rounded bg-[var(--hq-canvas)] px-1">/api/integrations/instagram/callback</code>) in
        Railway. Since this only ever reads your own account, no Meta App Review is needed.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        Connect your Protocol Instagram account so Reels, captions, and engagement sync in
        automatically.
      </p>
      <a
        href="/api/integrations/instagram/connect"
        className="mt-3 inline-block rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white"
      >
        Connect Instagram
      </a>
    </div>
  );
}
