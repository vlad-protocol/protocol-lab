"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TwilioConnectCard({
  connected,
  phoneNumber,
}: {
  connected: boolean;
  phoneNumber: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ accountSid: "", authToken: "", phoneNumber: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/integrations/twilio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function disconnect() {
    await fetch("/api/integrations/twilio", { method: "DELETE" });
    router.refresh();
  }

  if (connected) {
    return (
      <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <p className="text-sm text-[var(--hq-text)]">
          Connected — texts and calls go through <span className="font-medium">{phoneNumber}</span>.
        </p>
        <button onClick={disconnect} className="text-xs text-[var(--hq-text-muted)] hover:text-red-600">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        From your Twilio Console: Account SID and Auth Token are on the dashboard homepage;
        the phone number is under Phone Numbers → Manage → Active Numbers (buy one first if
        you haven't). Format the number as +15551234567.
      </p>
      <input
        required
        placeholder="Account SID"
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
        value={form.accountSid}
        onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
      />
      <input
        required
        type="password"
        placeholder="Auth Token"
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
        value={form.authToken}
        onChange={(e) => setForm({ ...form, authToken: e.target.value })}
      />
      <input
        required
        placeholder="Phone number (+15551234567)"
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
        value={form.phoneNumber}
        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? "Saving…" : "Connect Twilio"}
      </button>
    </form>
  );
}
