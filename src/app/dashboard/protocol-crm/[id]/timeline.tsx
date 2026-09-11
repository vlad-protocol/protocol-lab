"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, MessageSquare, StickyNote, ArrowDownLeft, ArrowUpRight, PlayCircle, Video, Sparkles } from "lucide-react";
import { EmailInteractionModal } from "./email-interaction-modal";

type Interaction = {
  id: string;
  type: "EMAIL" | "CALL" | "TEXT" | "NOTE" | "VIDEO_CALL";
  direction: "INBOUND" | "OUTBOUND";
  subject: string | null;
  body: string | null;
  toAddress: string | null;
  phoneNumber: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  externalId: string | null;
  occurredAt: string;
  user: { id: string; name: string | null; email: string } | null;
};

const TYPE_ICON = { EMAIL: Mail, CALL: Phone, TEXT: MessageSquare, NOTE: StickyNote, VIDEO_CALL: Video };
const TYPE_LABEL: Record<Interaction["type"], string> = {
  EMAIL: "Email",
  CALL: "Call",
  TEXT: "Text",
  NOTE: "Note",
  VIDEO_CALL: "Video call",
};

type Tab = "note" | "call" | "video" | "text" | "email";

export function Timeline({
  contactId,
  interactions,
  contactEmail,
  contactPhone,
}: {
  contactId: string;
  interactions: Interaction[];
  contactEmail: string | null;
  contactPhone: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteForm, setNoteForm] = useState({ body: "" });
  const [callForm, setCallForm] = useState({ direction: "OUTBOUND", durationSeconds: "", body: "" });
  const [videoForm, setVideoForm] = useState({ direction: "OUTBOUND", durationSeconds: "", recordingUrl: "", body: "" });
  const [textForm, setTextForm] = useState({ to: contactPhone || "", body: "" });
  const [emailForm, setEmailForm] = useState({ to: contactEmail || "", subject: "", body: "" });
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null);
  const [repPhone, setRepPhone] = useState("");

  function closeAndRefresh() {
    setTab(null);
    setError(null);
    router.refresh();
  }

  async function logManual(type: "NOTE" | "CALL" | "VIDEO_CALL", data: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/contacts/${contactId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...data }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong.");
      return;
    }
    closeAndRefresh();
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    await logManual("NOTE", { direction: "OUTBOUND", body: noteForm.body });
    setNoteForm({ body: "" });
  }

  async function submitCall(e: React.FormEvent) {
    e.preventDefault();
    await logManual("CALL", {
      direction: callForm.direction,
      durationSeconds: Number(callForm.durationSeconds) || null,
      body: callForm.body,
    });
    setCallForm({ direction: "OUTBOUND", durationSeconds: "", body: "" });
  }

  async function submitVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoForm.recordingUrl && !videoForm.body) {
      setError("Add a link to the recording, or at least a note about what was discussed.");
      return;
    }
    await logManual("VIDEO_CALL", {
      direction: videoForm.direction,
      durationSeconds: Number(videoForm.durationSeconds) || null,
      recordingUrl: videoForm.recordingUrl || null,
      body: videoForm.body,
    });
    setVideoForm({ direction: "OUTBOUND", durationSeconds: "", recordingUrl: "", body: "" });
  }

  async function submitText(sendReal: boolean) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/comms/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, to: textForm.to, text: textForm.body, logOnly: !sendReal }),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Something went wrong.");
      return;
    }
    setTextForm({ to: contactPhone || "", body: "" });
    closeAndRefresh();
  }

  async function suggestFollowUp() {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/suggest-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraftError(d.error || "Couldn't draft a follow-up.");
        return;
      }
      setEmailForm((f) => ({ ...f, subject: d.subject || f.subject, body: d.body || f.body }));
    } catch {
      setDraftError("Couldn't draft a follow-up.");
    } finally {
      setDrafting(false);
    }
  }

  async function submitEmail(sendReal: boolean) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        to: emailForm.to,
        subject: emailForm.subject,
        text: emailForm.body,
        logOnly: !sendReal,
      }),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Something went wrong.");
      return;
    }
    setEmailForm({ to: contactEmail || "", subject: "", body: "" });
    closeAndRefresh();
  }

  async function startCall() {
    if (!contactPhone) {
      setError("This contact has no phone number on file.");
      return;
    }
    if (!repPhone) {
      setError("Enter your own phone number so Twilio can ring you first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/comms/calls/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, contactPhone, repPhone }),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Something went wrong.");
      return;
    }
    closeAndRefresh();
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab(tab === "note" ? null : "note")} className="rounded-full border border-[var(--hq-card-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--hq-text)]">
          {tab === "note" ? "−" : "+"} Note
        </button>
        <button onClick={() => setTab(tab === "call" ? null : "call")} className="rounded-full border border-[var(--hq-card-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--hq-text)]">
          {tab === "call" ? "−" : "+"} Log call
        </button>
        <button onClick={() => setTab(tab === "video" ? null : "video")} className="rounded-full border border-[var(--hq-card-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--hq-text)]">
          {tab === "video" ? "−" : "+"} Video call
        </button>
        <button onClick={() => setTab(tab === "text" ? null : "text")} className="rounded-full border border-[var(--hq-card-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--hq-text)]">
          {tab === "text" ? "−" : "+"} Text
        </button>
        <button onClick={() => setTab(tab === "email" ? null : "email")} className="rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white">
          {tab === "email" ? "−" : "+"} Email
        </button>
      </div>

      {tab && (
        <div className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          {tab === "note" && (
            <form onSubmit={submitNote} className="space-y-2">
              <textarea
                required
                autoFocus
                rows={3}
                placeholder="What happened?"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={noteForm.body}
                onChange={(e) => setNoteForm({ body: e.target.value })}
              />
              <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                Save note
              </button>
            </form>
          )}

          {tab === "call" && (
            <div className="space-y-3">
              <div className="rounded-md bg-[var(--hq-canvas)] p-3 text-xs text-[var(--hq-text-muted)]">
                Start a live recorded call (rings your phone, then bridges to the contact and
                records once connected — requires Twilio to be connected in Settings), or just
                log a call you already made.
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--hq-text-muted)]">Your phone number</label>
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                    placeholder="+1 555 000 0000"
                    value={repPhone}
                    onChange={(e) => setRepPhone(e.target.value)}
                  />
                </div>
                <button
                  onClick={startCall}
                  disabled={submitting}
                  className="flex items-center gap-1 rounded-md bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  <PlayCircle className="h-4 w-4" /> Call & record
                </button>
              </div>
              <hr className="border-[var(--hq-card-border)]" />
              <form onSubmit={submitCall} className="space-y-2">
                <div className="flex gap-2">
                  <select
                    className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                    value={callForm.direction}
                    onChange={(e) => setCallForm({ ...callForm, direction: e.target.value })}
                  >
                    <option value="OUTBOUND">Outbound</option>
                    <option value="INBOUND">Inbound</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Duration (seconds)"
                    className="flex-1 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                    value={callForm.durationSeconds}
                    onChange={(e) => setCallForm({ ...callForm, durationSeconds: e.target.value })}
                  />
                </div>
                <textarea
                  placeholder="What was discussed?"
                  rows={2}
                  className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={callForm.body}
                  onChange={(e) => setCallForm({ ...callForm, body: e.target.value })}
                />
                <button disabled={submitting} className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm font-medium text-[var(--hq-text)] disabled:opacity-50">
                  Log call manually
                </button>
              </form>
            </div>
          )}

          {tab === "video" && (
            <form onSubmit={submitVideo} className="space-y-2">
              <div className="rounded-md bg-[var(--hq-canvas)] p-3 text-xs text-[var(--hq-text-muted)]">
                Log a video call (Zoom, Meet, Teams, etc.) — paste the link to wherever the
                recording lives (Zoom cloud, Google Drive, YouTube unlisted, whatever you use) so
                it shows up right here on the lead's timeline.
              </div>
              <div className="flex gap-2">
                <select
                  className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={videoForm.direction}
                  onChange={(e) => setVideoForm({ ...videoForm, direction: e.target.value })}
                >
                  <option value="OUTBOUND">Outbound</option>
                  <option value="INBOUND">Inbound</option>
                </select>
                <input
                  type="number"
                  placeholder="Duration (seconds)"
                  className="flex-1 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={videoForm.durationSeconds}
                  onChange={(e) => setVideoForm({ ...videoForm, durationSeconds: e.target.value })}
                />
              </div>
              <input
                type="url"
                placeholder="Link to the recorded call (e.g. https://zoom.us/rec/...)"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={videoForm.recordingUrl}
                onChange={(e) => setVideoForm({ ...videoForm, recordingUrl: e.target.value })}
              />
              <textarea
                placeholder="What was discussed?"
                rows={2}
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={videoForm.body}
                onChange={(e) => setVideoForm({ ...videoForm, body: e.target.value })}
              />
              <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                Log video call
              </button>
            </form>
          )}

          {tab === "text" && (
            <div className="space-y-2">
              <input
                placeholder="To (phone number)"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={textForm.to}
                onChange={(e) => setTextForm({ ...textForm, to: e.target.value })}
              />
              <textarea
                rows={2}
                placeholder="Message"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={textForm.body}
                onChange={(e) => setTextForm({ ...textForm, body: e.target.value })}
              />
              <div className="flex gap-2">
                <button onClick={() => submitText(true)} disabled={submitting} className="rounded-md bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                  Send via Twilio
                </button>
                <button onClick={() => submitText(false)} disabled={submitting} className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm font-medium text-[var(--hq-text)] disabled:opacity-50">
                  Just log it (sent elsewhere)
                </button>
              </div>
            </div>
          )}

          {tab === "email" && (
            <div className="space-y-2">
              <input
                placeholder="To"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              />
              <input
                placeholder="Subject"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              />
              <textarea
                rows={4}
                placeholder="Message"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
              />
              <div>
                <button
                  type="button"
                  onClick={suggestFollowUp}
                  disabled={drafting}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-[var(--hq-accent)] disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {drafting ? "Drafting…" : "AI: Suggest a follow-up"}
                </button>
                {draftError && <p className="mt-1 text-xs text-red-600">{draftError}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => submitEmail(true)} disabled={submitting} className="rounded-md bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                  Send via Gmail
                </button>
                <button onClick={() => submitEmail(false)} disabled={submitting} className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm font-medium text-[var(--hq-text)] disabled:opacity-50">
                  Just log it (sent elsewhere)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {interactions.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            No interactions logged yet. This is the shared thread everyone on the team sees.
          </p>
        )}
        {interactions.map((i) => {
          const Icon = TYPE_ICON[i.type];
          const DirIcon = i.direction === "INBOUND" ? ArrowDownLeft : ArrowUpRight;
          return (
            <div key={i.id} className="flex gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--hq-accent-soft)] text-[var(--hq-accent)]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
                    <DirIcon className="h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
                    {i.subject || TYPE_LABEL[i.type]}
                  </p>
                  <p className="text-xs text-[var(--hq-text-muted)]">
                    {new Date(i.occurredAt).toLocaleString()}
                  </p>
                </div>
                {i.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--hq-text-muted)]">{i.body}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--hq-text-muted)]">
                  <span>{i.user?.name || i.user?.email || "Auto-logged"}</span>
                  {i.durationSeconds != null && <span>{Math.round(i.durationSeconds / 60)} min</span>}
                  {i.recordingUrl && (
                    <a href={i.recordingUrl} target="_blank" className="font-medium text-[var(--hq-accent)] hover:underline">
                      {i.type === "VIDEO_CALL" ? "Watch recording" : "Play recording"}
                    </a>
                  )}
                  {i.type === "EMAIL" && i.externalId && (
                    <button
                      onClick={() => setViewingEmailId(i.id)}
                      className="font-medium text-[var(--hq-accent)] hover:underline"
                    >
                      View full email · Reply · Forward
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewingEmailId && (
        <EmailInteractionModal
          contactId={contactId}
          interactionId={viewingEmailId}
          onClose={() => setViewingEmailId(null)}
        />
      )}
    </div>
  );
}
