"use client";

import { useState } from "react";
import { Plus, Trash2, Check, X as XIcon } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Availability = { id: string; dayOfWeek: number; startTime: string; endTime: string };
type BookingRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  requestedAt: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED";
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-neutral-100 text-neutral-500",
};

export function BookingView({
  initialAvailabilities,
  initialRequests,
}: {
  initialAvailabilities: Availability[];
  initialRequests: BookingRequest[];
}) {
  const [availabilities, setAvailabilities] = useState(initialAvailabilities);
  const [requests, setRequests] = useState(initialRequests);
  const [form, setForm] = useState({ dayOfWeek: "1", startTime: "09:00", endTime: "17:00" });
  const [submitting, setSubmitting] = useState(false);

  async function addAvailability(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    });
    const data = await res.json();
    if (data.availability) setAvailabilities((prev) => [...prev, data.availability]);
    setSubmitting(false);
  }

  async function removeAvailability(id: string) {
    setAvailabilities((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
  }

  async function setStatus(id: string, status: "CONFIRMED" | "DECLINED") {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch(`/api/booking-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-[var(--hq-text)]">Weekly availability</h3>
        <form
          onSubmit={addAvailability}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-3"
        >
          <select
            value={form.dayOfWeek}
            onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
            className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1 rounded-lg bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </form>
        <div className="mt-2 flex flex-col gap-1.5">
          {availabilities.map((a) => (
            <div
              key={a.id}
              className="group flex items-center justify-between rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
            >
              <span>
                {DAYS[a.dayOfWeek]} — {a.startTime} to {a.endTime}
              </span>
              <button
                onClick={() => removeAvailability(a.id)}
                className="opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
              </button>
            </div>
          ))}
          {availabilities.length === 0 && (
            <p className="text-xs text-[var(--hq-text-muted)]">
              No windows set yet — the /book page will show nothing until you add some.
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--hq-text)]">Requests</h3>
        <div className="mt-2 flex flex-col gap-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--hq-text)]">{r.name}</p>
                  <p className="text-xs text-[var(--hq-text-muted)]">{r.email}</p>
                  <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
                    {new Date(r.requestedAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {r.message && <p className="mt-1 text-xs text-[var(--hq-text)]">{r.message}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {r.status === "PENDING" && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setStatus(r.id, "CONFIRMED")}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    <Check className="h-3 w-3" /> Confirm
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "DECLINED")}
                    className="flex items-center gap-1 rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700"
                  >
                    <XIcon className="h-3 w-3" /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-xs text-[var(--hq-text-muted)]">No requests yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
