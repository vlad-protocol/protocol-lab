"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Availability = { id: string; dayOfWeek: number; startTime: string; endTime: string };

export function BookForm({ availabilities }: { availabilities: Availability[] }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", requestedAt: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.requestedAt) {
      setError("Name, email, and a requested time are required.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/booking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        requestedAt: new Date(form.requestedAt).toISOString(),
      }),
    });
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setError("Something went wrong — try again.");
  }

  if (done) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>Request sent. You&apos;ll hear back once it&apos;s confirmed.</span>
      </div>
    );
  }

  return (
    <div>
      {availabilities.length > 0 && (
        <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
          <p className="mb-1 font-medium text-neutral-700">Open windows</p>
          {availabilities.map((a) => (
            <p key={a.id}>
              {DAYS[a.dayOfWeek]}: {a.startTime}–{a.endTime}
            </p>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="Your name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Requested time
          <input
            required
            type="datetime-local"
            value={form.requestedAt}
            onChange={(e) => setForm((f) => ({ ...f, requestedAt: e.target.value }))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          />
        </label>
        <textarea
          placeholder="What's this about? (optional)"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          rows={3}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Request this time"}
        </button>
      </form>
    </div>
  );
}
