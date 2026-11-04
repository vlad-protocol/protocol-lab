"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rocket, PlusCircle } from "lucide-react";

type ActivationCard = {
  id: string;
  eventName: string;
  eventDate: string | null;
  brandName: string;
  quoteTotal: number;
  stepsDone: number;
  stepsTotal: number;
  paymentsReceived: number;
  paymentsTotal: number;
};

type WonContact = { id: string; companyName: string | null; contactName: string; industry: string | null; dealValue: number | null };

export function ActivationsShell({ activations, wonContacts }: { activations: ActivationCard[]; wonContacts: WonContact[] }) {
  const router = useRouter();
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function createActivation(contactId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, eventName: eventName || "Untitled activation", eventDate: eventDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create activation.");
      router.push(`/dashboard/activations/${data.activation.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create activation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-2">
        <Rocket className="h-5 w-5 text-[var(--hq-accent)]" />
        <h1 className="text-lg font-semibold text-[var(--hq-text)]">Activations</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--hq-text-muted)]">
        Signed brand-event deals, run through the B2B SOP's 17-step timeline, Activation Rules gate, cost sheet, and sponsor tracker.
      </p>

      {wonContacts.length > 0 && (
        <div className="mb-8 rounded-lg border border-[var(--hq-card-border)] bg-[var(--hq-card)] p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">
            Won leads without an Activation yet
          </div>
          <div className="flex flex-col gap-2">
            {wonContacts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--hq-card-border)] pt-2 first:border-t-0 first:pt-0">
                <span className="text-sm text-[var(--hq-text)]">{c.companyName || c.contactName}</span>
                {creatingFor === c.id ? (
                  <>
                    <input
                      className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-xs"
                      placeholder="Event name"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                    />
                    <input
                      type="date"
                      className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-xs"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                    <button
                      disabled={busy}
                      onClick={() => createActivation(c.id)}
                      className="rounded bg-[var(--hq-accent)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Create
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setCreatingFor(c.id)}
                    className="flex items-center gap-1 text-xs text-[var(--hq-accent)]"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Start Activation
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {activations.map((a) => (
          <Link
            key={a.id}
            href={`/dashboard/activations/${a.id}`}
            className="rounded-lg border border-[var(--hq-card-border)] bg-[var(--hq-card)] p-4 hover:border-[var(--hq-accent)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--hq-text)]">{a.eventName}</span>
              <span className="text-xs text-[var(--hq-text-muted)]">{a.eventDate ? new Date(a.eventDate).toLocaleDateString() : "Date TBD"}</span>
            </div>
            <div className="mt-1 text-xs text-[var(--hq-text-muted)]">{a.brandName}</div>
            <div className="mt-2 flex gap-4 text-xs text-[var(--hq-text-muted)]">
              <span>Timeline: {a.stepsDone}/{a.stepsTotal}</span>
              <span>Payments: {a.paymentsReceived}/{a.paymentsTotal}</span>
              <span>Quote: ${a.quoteTotal.toLocaleString()}</span>
            </div>
          </Link>
        ))}
        {activations.length === 0 && <div className="text-sm text-[var(--hq-text-muted)]">No activations yet.</div>}
      </div>
    </div>
  );
}
