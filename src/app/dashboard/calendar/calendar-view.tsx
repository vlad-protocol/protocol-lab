"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2, MapPin, Clock } from "lucide-react";

type Contact = { id: string; companyName: string | null; contactName: string };

type Event = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  contactId: string | null;
  contact: Contact | null;
};

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function CalendarView({
  initialEvents,
  contacts,
}: {
  initialEvents: Event[];
  contacts: Contact[];
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
  const [form, setForm] = useState({
    title: "",
    startsAt: toLocalInput(defaultStart),
    endsAt: toLocalInput(defaultEnd),
    location: "",
    notes: "",
    contactId: "",
  });

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => new Date(e.endsAt) >= new Date(new Date().toDateString()))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [events]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of upcoming) {
      const k = dayKey(e.startsAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [upcoming]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        location: form.location || undefined,
        notes: form.notes || undefined,
        contactId: form.contactId || undefined,
      }),
    });
    const data = await res.json();
    if (data.event) setEvents((prev) => [...prev, data.event]);
    setForm((f) => ({ ...f, title: "", location: "", notes: "", contactId: "" }));
    setSubmitting(false);
    setShowAdd(false);
  }

  async function remove(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add event
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hq-text)]">New event</h3>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-[var(--hq-text-muted)]" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="flex flex-col gap-1 text-xs text-[var(--hq-text-muted)]">
              Starts
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm text-[var(--hq-text)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--hq-text-muted)]">
              Ends
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm text-[var(--hq-text)]"
              />
            </label>
            <select
              value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            >
              <option value="">No contact linked</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.contactName}
                </option>
              ))}
            </select>
            <input
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add event"}
          </button>
        </form>
      )}

      <div className="mt-5 flex flex-col gap-5">
        {grouped.map(([day, dayEvents]) => (
          <div key={day}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--hq-text-muted)]">
              {fmtDay(dayEvents[0].startsAt)}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-3.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--hq-text)]">{event.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--hq-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {fmtTime(event.startsAt)} – {fmtTime(event.endsAt)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      {event.contact && (
                        <span className="text-[var(--hq-accent)]">
                          {event.contact.companyName || event.contact.contactName}
                        </span>
                      )}
                    </div>
                    {event.notes && (
                      <p className="mt-1 text-xs text-[var(--hq-text-muted)]">{event.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(event.id)}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
            Nothing on the calendar yet.
          </div>
        )}
      </div>
    </div>
  );
}
