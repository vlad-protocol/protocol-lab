"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";

type Question = { id: string; label: string; type: string; required: boolean; options: string[] };

type EventTypeInfo = {
  slug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  location: string | null;
  hostName: string;
  questions: Question[];
};

type Slot = { start: string; end: string };

type Step = "questions" | "slot" | "details" | "done";

export function BookFlow({ eventType }: { eventType: EventTypeInfo }) {
  const hasQuestions = eventType.questions.length > 0;
  const [step, setStep] = useState<Step>(hasQuestions ? "questions" : "slot");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "slot" || slots !== null) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch("/api/public/booking/" + eventType.slug + "/slots?tz=" + encodeURIComponent(tz))
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Couldn't load open times.");
        return res.json();
      })
      .then((data) => setSlots(data.slots || []))
      .catch((e) => setSlotsError(e.message));
  }, [step, slots, eventType.slug]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots || []) {
      const d = new Date(s.start);
      const key = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  function missingRequired() {
    return eventType.questions.find((q) => q.required && !answers[q.id]?.trim());
  }

  async function submit() {
    if (!name.trim() || !email.trim() || !selectedSlot) {
      setError("Name, email and a time are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/public/booking/" + eventType.slug + "/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        startsAt: selectedSlot.start,
        answers: eventType.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || "" })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "That time just got taken — pick another.");
      setSlots(null);
      setSelectedSlot(null);
      setStep("slot");
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="font-medium text-emerald-900">You&apos;re booked.</p>
        <p className="text-sm text-emerald-800">
          {eventType.name} with {eventType.hostName}
          {selectedSlot && (
            <>
              {" "}
              on {new Date(selectedSlot.start).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at{" "}
              {new Date(selectedSlot.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </>
          )}
          . A confirmation has been sent to {email}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{eventType.name}</h1>
      {eventType.description && <p className="mt-1 text-sm text-neutral-500">{eventType.description}</p>}
      <p className="mt-1 text-xs text-neutral-400">
        {eventType.durationMinutes} min with {eventType.hostName}
        {eventType.location ? " · " + eventType.location : ""}
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {step === "questions" && (
        <div className="mt-6 space-y-4">
          {eventType.questions.map((q) => (
            <div key={q.id}>
              <label className="text-sm font-medium text-neutral-800">
                {q.label}
                {q.required && <span className="text-red-500"> *</span>}
              </label>
              {q.type === "TEXTAREA" ? (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              ) : q.type === "DROPDOWN" ? (
                <select
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : q.type === "RADIO" ? (
                <div className="mt-1 space-y-1">
                  {q.options.map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : q.type === "CHECKBOX" ? (
                <div className="mt-1 space-y-1">
                  {q.options.map((o) => {
                    const current = (answers[q.id] || "").split(",").filter(Boolean);
                    const checked = current.includes(o);
                    return (
                      <label key={o} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? current.filter((v) => v !== o) : [...current, o];
                            setAnswers((a) => ({ ...a, [q.id]: next.join(",") }));
                          }}
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  type={q.type === "PHONE" ? "tel" : "text"}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const missing = missingRequired();
              if (missing) {
                setError('Please answer "' + missing.label + '".');
                return;
              }
              setError(null);
              setStep("slot");
            }}
            className="mt-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Continue
          </button>
        </div>
      )}

      {step === "slot" && (
        <div className="mt-6">
          {hasQuestions && (
            <button onClick={() => setStep("questions")} className="mb-3 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}
          {!slots && !slotsError && (
            <p className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading open times…
            </p>
          )}
          {slots && slots.length === 0 && <p className="text-sm text-neutral-500">No open times in the next few weeks — check back soon.</p>}
          <div className="space-y-4">
            {Array.from(slotsByDate.entries()).map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-sm font-medium text-neutral-800">{date}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <button
                      key={s.start}
                      onClick={() => {
                        setSelectedSlot(s);
                        setStep("details");
                      }}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
                    >
                      {new Date(s.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="mt-6 space-y-3">
          <button onClick={() => setStep("slot")} className="mb-1 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {selectedSlot && (
            <p className="text-sm text-neutral-600">
              {new Date(selectedSlot.start).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at{" "}
              {new Date(selectedSlot.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-neutral-800">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-800">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-800">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <button onClick={submit} disabled={submitting} className="mt-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      )}
    </div>
  );
}
