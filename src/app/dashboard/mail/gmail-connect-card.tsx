"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function GmailConnectCard({ connected, email }: { connected: boolean; email: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const gmailStatus = params.get("gmail");

  async function disconnect() {
    await fetch("/api/integrations/gmail/status", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      {gmailStatus === "connected" && (
        <p className="mb-2 text-sm text-[var(--hq-positive)]">Gmail connected.</p>
      )}
      {gmailStatus === "error" && (
        <p className="mb-2 text-sm text-red-600">Something went wrong connecting Gmail. Try again.</p>
      )}
      {gmailStatus === "not-configured" && (
        <p className="mb-2 text-sm text-red-600">
          Gmail isn&apos;t set up on this deployment yet — the owner needs to add Google OAuth
          credentials in Railway. See the README&apos;s &quot;Connecting Gmail&quot; section.
        </p>
      )}
      {gmailStatus === "no-refresh-token" && (
        <p className="mb-2 text-sm text-red-600">
          Google didn&apos;t return a long-lived connection this time — this usually happens if
          you&apos;d connected before and it&apos;s reusing an old consent. Go to{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            your Google account&apos;s connected apps
          </a>
          , remove access for this app, then try Connect Gmail again.
        </p>
      )}
      {connected ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--hq-text)]">
            Connected as <span className="font-medium">{email}</span>. Emails you send from
            a contact&apos;s page go out from this address.
          </p>
          <button onClick={disconnect} className="text-xs text-[var(--hq-text-muted)] hover:text-red-600">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--hq-text-muted)]">
            Your Gmail isn&apos;t connected. Until it is, emails you send from the CRM are logged
            but not actually delivered.
          </p>
          <a
            href="/api/integrations/gmail/connect"
            className="rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white"
          >
            Connect Gmail
          </a>
        </div>
      )}
    </div>
  );
}
