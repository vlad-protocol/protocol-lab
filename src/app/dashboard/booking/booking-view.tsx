"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Pencil, Plus, X, Bell, Clock, CheckCircle2 } from "lucide-react";

type QuestionType = "TEXT" | "TEXTAREA" | "RADIO" | "CHECKBOX" | "DROPDOWN" | "PHONE";

type Question = { id: string; label: string; type: QuestionType; required: boolean; options: string[]; order: number };

type EventType = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  requiresQuestions: boolean;
  questions: Question[];
  location: string | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
  dailyLimit: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  bookingCount: number;
  host: { id: string; name: string | null; email: string };
};

type Availability = { id: string; hostUserId: string; dayOfWeek: number; startTime: string; endTime: string };

type Answer = { id: string; label: string; answer: string };

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  startsAt: string;
  endsAt: string;
  status: "CONFIRMED" | "CANCELED";
  cancelReason: string | null;
  eventType: { name: string; slug: string };
  host: { id: string; name: string | null; email: string };
  answers: Answer[];
};

type Reminder = {
  id: string;
  eventTypeId: string | null;
  eventType: { name: string } | null;
  minutesBefore: number;
  channel: "EMAIL" | "SMS";
  messageTemplate: string;
  enabled: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "TEXT", label: "Short text" },
  { value: "TEXTAREA", label: "Long text" },
  { value: "RADIO", label: "Single choice" },
  { value: "CHECKBOX", label: "Multiple choice" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "PHONE", label: "Phone number" },
];

function emptyQuestion(order: number): Question {
  return { id: "new-" + Math.random().toString(36).slice(2), label: "", type: "TEXT", required: true, options: [], order };
}

type Props = {
  isOwner: boolean;
  currentUserId: string;
  users: { id: string; name: string | null; email: string }[];
  gmailConnected: boolean;
  gmailEmail: string | null;
  initialEventTypes: EventType[];
  initialAvailabilities: Availability[];
  initialBookings: Booking[];
  initialReminders: Reminder[];
};

export function BookingView(props: Props) {
  const [tab, setTab] = useState<"links" | "availability" | "bookings" | "calendar" | "reminders">("links");

  const tabs: { key: typeof tab; label: string; show: boolean }[] = [
    { key: "links", label: "My links", show: true },
    { key: "availability", label: "Availability", show: true },
    { key: "bookings", label: "Bookings", show: true },
    { key: "calendar", label: "Google Calendar", show: true },
    { key: "reminders", label: "Reminders", show: props.isOwner },
  ];

  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--hq-card-border)]">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 " +
              (tab === t.key
                ? "border-[var(--hq-accent)] text-[var(--hq-accent)]"
                : "border-transparent text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "links" && <LinksTab {...props} />}
        {tab === "availability" && <AvailabilityTab {...props} />}
        {tab === "bookings" && <BookingsTab {...props} />}
        {tab === "calendar" && <CalendarTab {...props} />}
        {tab === "reminders" && props.isOwner && <RemindersTab {...props} />}
      </div>
    </div>
  );
}

function LinksTab(props: Props) {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState(props.initialEventTypes);
  const [editing, setEditing] = useState<EventType | "new" | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function copyLink(slug: string) {
    const url = baseUrl + "/book/" + slug;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    } catch {
      /* ignore */
    }
  }

  async function toggleActive(et: EventType) {
    const res = await fetch("/api/booking/event-types/" + et.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !et.active }),
    });
    if (res.ok) {
      setEventTypes((prev) => prev.map((e) => (e.id === et.id ? { ...e, active: !e.active } : e)));
    }
  }

  async function remove(et: EventType) {
    if (!confirm('Delete "' + et.name + '"? Past bookings stay on record, but the link stops working.')) return;
    const res = await fetch("/api/booking/event-types/" + et.id, { method: "DELETE" });
    if (res.ok) setEventTypes((prev) => prev.filter((e) => e.id !== et.id));
  }

  if (editing) {
    return (
      <EventTypeForm
        eventType={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null);
          setEventTypes((prev) => {
            const exists = prev.some((e) => e.id === saved.id);
            return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
          });
          router.refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--hq-text-muted)]">
          Each link is its own booking page — give one qualification questions and keep another
          simple, so you can send the right link for the situation.
        </p>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" /> New link
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {eventTypes.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-6 text-center text-sm text-[var(--hq-text-muted)]">
            No booking links yet. Create one to get a shareable scheduling page.
          </p>
        )}
        {eventTypes.map((et) => (
          <div key={et.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--hq-text)]">{et.name}</p>
                  {!et.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Paused</span>
                  )}
                  {et.requiresQuestions && (
                    <span className="rounded-full bg-[var(--hq-accent-soft,#eef2ff)] px-2 py-0.5 text-[10px] font-medium text-[var(--hq-accent)]">
                      Qualification questions
                    </span>
                  )}
                </div>
                {et.description && <p className="mt-1 text-sm text-[var(--hq-text-muted)]">{et.description}</p>}
                <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
                  {et.durationMinutes} min
                  {props.isOwner ? " · host: " + (et.host.name || et.host.email) : ""} · {et.bookingCount} booked
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-gray-50 px-2 py-1 text-xs text-[var(--hq-text-muted)]">/book/{et.slug}</code>
                  <button
                    onClick={() => copyLink(et.slug)}
                    className="flex items-center gap-1 text-xs text-[var(--hq-accent)] hover:underline"
                  >
                    <Copy className="h-3 w-3" /> {copiedSlug === et.slug ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleActive(et)}
                  className="text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
                  title={et.active ? "Pause this link" : "Reactivate this link"}
                >
                  {et.active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => setEditing(et)} className="text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(et)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventTypeForm({
  eventType,
  onCancel,
  onSaved,
}: {
  eventType: EventType | null;
  onCancel: () => void;
  onSaved: (e: EventType) => void;
}) {
  const [name, setName] = useState(eventType?.name || "");
  const [description, setDescription] = useState(eventType?.description || "");
  const [duration, setDuration] = useState(eventType?.durationMinutes ?? 30);
  const [location, setLocation] = useState(eventType?.location || "");
  const [bufferBefore, setBufferBefore] = useState(eventType?.bufferBeforeMinutes ?? 0);
  const [bufferAfter, setBufferAfter] = useState(eventType?.bufferAfterMinutes ?? 0);
  const [minNotice, setMinNotice] = useState(eventType?.minNoticeHours ?? 2);
  const [dailyLimit, setDailyLimit] = useState<string>(eventType?.dailyLimit != null ? String(eventType.dailyLimit) : "");
  const [requiresQuestions, setRequiresQuestions] = useState(eventType?.requiresQuestions ?? false);
  const [questions, setQuestions] = useState<Question[]>(eventType?.questions || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)]);
  }
  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function save() {
    if (!name.trim()) {
      setError("Give the link a name.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      durationMinutes: Number(duration),
      location: location.trim() || null,
      bufferBeforeMinutes: Number(bufferBefore),
      bufferAfterMinutes: Number(bufferAfter),
      minNoticeHours: Number(minNotice),
      dailyLimit: dailyLimit.trim() ? Number(dailyLimit) : null,
      requiresQuestions,
      questions: requiresQuestions
        ? questions.map((q, i) => ({ label: q.label, type: q.type, required: q.required, options: q.options, order: i }))
        : [],
    };
    const res = await fetch(eventType ? "/api/booking/event-types/" + eventType.id : "/api/booking/event-types", {
      method: eventType ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Couldn't save this link.");
      return;
    }
    onSaved(data);
  }

  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="font-medium text-[var(--hq-text)]">{eventType ? "Edit link" : "New booking link"}</p>
        <button onClick={onCancel} className="text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Discovery call"
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Duration (minutes)</label>
          <input
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Description (shown on the booking page)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A quick call to see if we're a fit."
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Location / call link</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Google Meet link, phone, etc."
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Minimum notice (hours)</label>
          <input
            type="number"
            min={0}
            value={minNotice}
            onChange={(e) => setMinNotice(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Buffer before (minutes)</label>
          <input
            type="number"
            min={0}
            value={bufferBefore}
            onChange={(e) => setBufferBefore(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Buffer after (minutes)</label>
          <input
            type="number"
            min={0}
            value={bufferAfter}
            onChange={(e) => setBufferAfter(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Max bookings per day (optional)</label>
          <input
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="No limit"
            className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--hq-card-border)] pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--hq-text)]">
          <input type="checkbox" checked={requiresQuestions} onChange={(e) => setRequiresQuestions(e.target.checked)} />
          Ask qualification questions before they can book
        </label>
        <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
          Leave this off for a plain, no-questions link. Turn it on and build the question set below for
          links where you want the lead to answer something first — create a second link if you want
          both versions.
        </p>

        {requiresQuestions && (
          <div className="mt-3 space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-[var(--hq-card-border)] p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={q.label}
                    onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                    placeholder="Question text"
                    className="flex-1 rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                    className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] whitespace-nowrap">
                    <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} />
                    Required
                  </label>
                  <button onClick={() => removeQuestion(q.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {(q.type === "RADIO" || q.type === "CHECKBOX" || q.type === "DROPDOWN") && (
                  <input
                    value={q.options.join(", ")}
                    onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                    placeholder="Options, comma-separated"
                    className="mt-2 w-full rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
                  />
                )}
              </div>
            ))}
            <button onClick={addQuestion} className="flex items-center gap-1 text-xs font-medium text-[var(--hq-accent)]">
              <Plus className="h-3.5 w-3.5" /> Add question
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-4 py-1.5 text-sm text-[var(--hq-text-muted)]">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save link"}
        </button>
      </div>
    </div>
  );
}

function AvailabilityTab(props: Props) {
  const [rows, setRows] = useState(props.initialAvailabilities);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  async function addRow() {
    setError(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: day, startTime: start, endTime: end }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Couldn't add that window.");
      return;
    }
    setRows((prev) => [...prev, data].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)));
  }

  async function removeRow(id: string) {
    const res = await fetch("/api/availability/" + id, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <p className="text-sm text-[var(--hq-text-muted)]">
        Set the weekly windows you&apos;re open for calls. These apply to every one of your booking
        links; slots that overlap something already on your Google Calendar won&apos;t be offered.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-[var(--hq-text-muted)]">Day</label>
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="mt-1 rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm">
            {DAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--hq-text-muted)]">From</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--hq-text-muted)]">To</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm" />
        </div>
        <button onClick={addRow} className="flex items-center gap-1 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white">
          <Plus className="h-3.5 w-3.5" /> Add window
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {DAYS.map((d, i) => {
          const dayRows = rows.filter((r) => r.dayOfWeek === i);
          if (dayRows.length === 0) return null;
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white px-4 py-2.5">
              <span className="w-24 text-sm font-medium text-[var(--hq-text)]">{d}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {dayRows.map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-[var(--hq-text-muted)]">
                    <Clock className="h-3 w-3" /> {r.startTime} – {r.endTime}
                    <button onClick={() => removeRow(r.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-6 text-center text-sm text-[var(--hq-text-muted)]">
            No availability set yet — add a window above so people have something to book.
          </p>
        )}
      </div>
    </div>
  );
}

function fmtRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const dateStr = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) + " – " + e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return dateStr + " · " + timeStr;
}

function BookingsTab(props: Props) {
  const [bookings, setBookings] = useState(props.initialBookings);
  const [expanded, setExpanded] = useState<string | null>(null);
  const upcoming = useMemo(
    () => bookings.filter((b) => b.status === "CONFIRMED" && new Date(b.startsAt).getTime() >= Date.now()).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [bookings]
  );
  const past = useMemo(
    () => bookings.filter((b) => b.status === "CANCELED" || new Date(b.startsAt).getTime() < Date.now()).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)),
    [bookings]
  );

  async function cancelBooking(id: string) {
    const reason = prompt("Reason for canceling (optional):") || undefined;
    const res = await fetch("/api/booking/bookings/" + id + "/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "CANCELED" as const, cancelReason: reason || null } : b)));
    }
  }

  function Row({ b }: { b: Booking }) {
    const isPast = new Date(b.startsAt).getTime() < Date.now();
    return (
      <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-[var(--hq-text)]">{b.name}</p>
              <span className="text-xs text-[var(--hq-text-muted)]">· {b.eventType.name}</span>
              {b.status === "CANCELED" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">Canceled</span>}
              {b.status === "CONFIRMED" && isPast && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Past</span>}
            </div>
            <p className="mt-0.5 text-sm text-[var(--hq-text-muted)]">{fmtRange(b.startsAt, b.endsAt)}</p>
            <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
              {b.email}
              {b.phone ? " · " + b.phone : ""}
              {props.isOwner ? " · host: " + (b.host.name || b.host.email) : ""}
            </p>
            {b.answers.length > 0 && (
              <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="mt-1 text-xs text-[var(--hq-accent)] hover:underline">
                {expanded === b.id ? "Hide answers" : "View answers (" + b.answers.length + ")"}
              </button>
            )}
            {expanded === b.id && (
              <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3">
                {b.answers.map((a) => (
                  <p key={a.id} className="text-xs text-[var(--hq-text)]">
                    <span className="text-[var(--hq-text-muted)]">{a.label}:</span> {a.answer}
                  </p>
                ))}
              </div>
            )}
          </div>
          {b.status === "CONFIRMED" && !isPast && (
            <button onClick={() => cancelBooking(b.id)} className="shrink-0 text-xs text-[var(--hq-text-muted)] hover:text-red-600">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--hq-text)]">Upcoming ({upcoming.length})</p>
        <div className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-[var(--hq-text-muted)]">Nothing booked yet.</p>}
          {upcoming.map((b) => <Row key={b.id} b={b} />)}
        </div>
      </div>
      {past.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--hq-text)]">Past & canceled</p>
          <div className="space-y-2">
            {past.slice(0, 50).map((b) => <Row key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarTab(props: Props) {
  const router = useRouter();

  async function disconnect() {
    await fetch("/api/integrations/gmail/status", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <p className="text-sm text-[var(--hq-text-muted)]">
        Booking syncs through the same Google connection as Mail — one &quot;Connect Gmail&quot;
        covers both your inbox and your calendar. When it&apos;s connected, new bookings are added
        to your primary Google Calendar automatically, and times that overlap something already on
        your calendar are never offered to people booking with you.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        {props.gmailConnected ? (
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm text-[var(--hq-text)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--hq-positive)]" />
              Connected as <span className="font-medium">{props.gmailEmail}</span>
            </p>
            <button onClick={disconnect} className="text-xs text-[var(--hq-text-muted)] hover:text-red-600">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--hq-text-muted)]">Not connected yet.</p>
            <a href="/api/integrations/gmail/connect" className="rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white">
              Connect Gmail
            </a>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-[var(--hq-text-muted)]">
        Connected Gmail before calendar sync was added? You&apos;ll need to disconnect and reconnect
        once so Google grants the new calendar permissions — your email connection itself won&apos;t
        be affected.
      </p>
    </div>
  );
}

function RemindersTab(props: Props) {
  const [reminders, setReminders] = useState(props.initialReminders);
  const [eventTypeId, setEventTypeId] = useState<string>("");
  const [minutesBefore, setMinutesBefore] = useState(1440);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [template, setTemplate] = useState("Hi {{name}}, just a reminder about your {{eventName}} call with {{host}} on {{time}}. {{location}}");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    const res = await fetch("/api/booking/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventTypeId: eventTypeId || null, minutesBefore, channel, messageTemplate: template }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Couldn't create that reminder.");
      return;
    }
    setReminders((prev) => [data, ...prev]);
  }

  async function toggle(r: Reminder) {
    const res = await fetch("/api/booking/reminders/" + r.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    if (res.ok) setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
  }

  async function remove(id: string) {
    const res = await fetch("/api/booking/reminders/" + id, { method: "DELETE" });
    if (res.ok) setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <p className="text-sm text-[var(--hq-text-muted)]">
        Reminders go out automatically before a booked call, to boost show-up rate. Use{" "}
        <code className="rounded bg-gray-50 px-1">{"{{name}}"}</code>, <code className="rounded bg-gray-50 px-1">{"{{host}}"}</code>,{" "}
        <code className="rounded bg-gray-50 px-1">{"{{eventName}}"}</code>, <code className="rounded bg-gray-50 px-1">{"{{time}}"}</code> and{" "}
        <code className="rounded bg-gray-50 px-1">{"{{location}}"}</code> in the message.
      </p>

      <div className="mt-4 space-y-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--hq-text-muted)]">Applies to</label>
            <select value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm">
              <option value="">All links</option>
              {props.initialEventTypes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--hq-text-muted)]">Minutes before</label>
            <input type="number" min={1} value={minutesBefore} onChange={(e) => setMinutesBefore(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm" />
            <p className="mt-0.5 text-[10px] text-[var(--hq-text-muted)]">1440 = 24 hours</p>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--hq-text-muted)]">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as "EMAIL" | "SMS")} className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm">
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--hq-text-muted)]">Message</label>
          <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-[var(--hq-card-border)] px-2 py-1.5 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button onClick={create} className="flex items-center gap-1 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white">
            <Plus className="h-3.5 w-3.5" /> Add reminder
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
            <div>
              <p className="flex items-center gap-2 text-sm text-[var(--hq-text)]">
                <Bell className="h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
                {r.minutesBefore} min before · {r.channel} · {r.eventType ? r.eventType.name : "All links"}
                {!r.enabled && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Off</span>}
              </p>
              <p className="mt-1 max-w-xl text-xs text-[var(--hq-text-muted)]">{r.messageTemplate}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggle(r)} className="text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
                {r.enabled ? "Turn off" : "Turn on"}
              </button>
              <button onClick={() => remove(r.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {reminders.length === 0 && <p className="text-sm text-[var(--hq-text-muted)]">No reminders set yet.</p>}
      </div>
    </div>
  );
}
