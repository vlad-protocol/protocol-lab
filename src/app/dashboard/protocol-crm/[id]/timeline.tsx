"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, MessageSquare, StickyNote, ArrowDownLeft, ArrowUpRight, PlayCircle, Video, Sparkles, FileText, Loader2, ChevronDown, ChevronUp, Trash2, Mic, Square, Pencil, X, Check } from "lucide-react";
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
  transcript: string | null;
  transcriptStatus: "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "SKIPPED" | null;
  transcriptError: string | null;
  callStageReached:
    | "NO_ANSWER"
    | "VOICEMAIL"
    | "GATEKEEPER"
    | "OWNER_REACHED"
    | "PITCHED"
    | "CONVERSATION_2MIN"
    | "VIDEO_CALL_BOOKED"
    | null;
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

const STAGE_LABEL: Record<NonNullable<Interaction["callStageReached"]>, string> = {
  NO_ANSWER: "No answer",
  VOICEMAIL: "Voicemail left",
  GATEKEEPER: "Gatekeeper only",
  OWNER_REACHED: "Owner reached",
  PITCHED: "Pitched",
  CONVERSATION_2MIN: "Conversation (2min+)",
  VIDEO_CALL_BOOKED: "Video call booked",
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
  const [callForm, setCallForm] = useState({
    direction: "OUTBOUND",
    durationSeconds: "",
    body: "",
    callStageReached: "",
    qualityNo: false,
  });
  const [videoForm, setVideoForm] = useState({ direction: "OUTBOUND", durationSeconds: "", recordingUrl: "", body: "", transcript: "" });
  const [textForm, setTextForm] = useState({ to: contactPhone || "", body: "" });
  const [emailForm, setEmailForm] = useState({ to: contactEmail || "", subject: "", body: "" });
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null);
  const [repPhone, setRepPhone] = useState("");
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [outcomeUpdatingId, setOutcomeUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", body: "", transcript: "", occurredAt: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // "Record live call" — capture audio through the phone's own mic while
  // Vlad is on a native call on speaker, not dialed through Twilio at all.
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);

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
      callStageReached: callForm.callStageReached || null,
      // "Quality no" is the Playbook's real-no signal: objected 2+ times
      // but still asked a real question — shorthand checkbox instead of
      // separate objection-count/last-question fields in this quick form.
      ...(callForm.qualityNo ? { resultTag: "NOT_INTERESTED", objectionAttempts: 2, lastQuestionAsked: true } : {}),
    });
    setCallForm({ direction: "OUTBOUND", durationSeconds: "", body: "", callStageReached: "", qualityNo: false });
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
      transcript: videoForm.transcript || null,
    });
    setVideoForm({ direction: "OUTBOUND", durationSeconds: "", recordingUrl: "", body: "", transcript: "" });
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

  async function setCallStage(interactionId: string, callStageReached: string | null) {
    setOutcomeUpdatingId(interactionId);
    const res = await fetch(`/api/contacts/${contactId}/interactions/${interactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callStageReached }),
    });
    setOutcomeUpdatingId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't update the call outcome.");
    }
  }

  async function deleteInteraction(interactionId: string) {
    if (!confirm("Delete this entry from the communication log? This can't be undone.")) return;
    setDeletingId(interactionId);
    const res = await fetch(`/api/contacts/${contactId}/interactions/${interactionId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't delete this entry.");
    }
  }

  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the
  // viewer's local time, with no timezone suffix — build that from the
  // Date's local getters (not toISOString, which is UTC).
  function toLocalDateTimeInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEdit(i: Interaction) {
    setEditingId(i.id);
    setEditError(null);
    setEditForm({
      subject: i.subject || "",
      body: i.body || "",
      transcript: i.transcript || "",
      occurredAt: toLocalDateTimeInput(i.occurredAt),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(i: Interaction) {
    setEditSaving(true);
    setEditError(null);
    const payload: Record<string, unknown> = {
      body: editForm.body || null,
      occurredAt: new Date(editForm.occurredAt).toISOString(),
    };
    // Subject only makes sense for types that show one (email, or a note
    // someone titled); transcript only for calls/video calls — but it's
    // harmless to always send both since the row simply has no value for
    // the ones that don't use it.
    if (i.subject !== null || editForm.subject) payload.subject = editForm.subject || null;
    if (i.transcript !== null || editForm.transcript) payload.transcript = editForm.transcript || null;

    const res = await fetch(`/api/contacts/${contactId}/interactions/${i.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setEditError(d.error || "Couldn't save your changes.");
    }
  }

  function pickRecordingMimeType() {
    // iPhone Safari only supports audio/mp4 (via its AAC encoder); Chrome
    // and most others support audio/webm. Fall back to letting the browser
    // choose if neither reports as supported.
    const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    for (const type of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) return type;
    }
    return undefined;
  }

  async function startRecording() {
    setRecordError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordError("This browser doesn't support recording audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mimeType = pickRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setRecordError("Couldn't access the microphone — check your browser's permission for this site.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    const mimeType = recorder.mimeType || "audio/webm";
    const finalSeconds = recordSeconds;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);

    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
    recordedChunksRef.current = [];

    if (blob.size === 0) {
      setRecordError("The recording came out empty — try again.");
      return;
    }

    setRecordSaving(true);
    setRecordError(null);
    try {
      const form = new FormData();
      const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `call-recording.${ext}`);
      form.append("direction", "OUTBOUND");
      form.append("durationSeconds", String(finalSeconds));
      const res = await fetch(`/api/contacts/${contactId}/record-call`, { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setRecordError(d.error || "Couldn't save the recording.");
        return;
      }
      closeAndRefresh();
    } catch {
      setRecordError("Couldn't save the recording — check your connection and try again.");
    } finally {
      setRecordSaving(false);
      setRecordSeconds(0);
    }
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
              <div className="rounded-xl border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-3">
                <p className="text-xs text-[var(--hq-text-muted)]">
                  Calling from your own phone? Put it on speaker, hit record here, and this page
                  captures the conversation through this device&apos;s microphone — no Twilio
                  bridging, nothing to dial. Call recording consent laws vary by state and
                  country; let the other party know they&apos;re being recorded where required.
                </p>
                {recordError && <p className="mt-2 text-xs text-red-600">{recordError}</p>}
                <div className="mt-2 flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={recordSaving}
                      className="flex items-center gap-1.5 rounded-md bg-[var(--hq-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <Mic className="h-4 w-4" />
                      {recordSaving ? "Saving…" : "Record live call"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                      Stop &amp; save
                    </button>
                  )}
                  {isRecording && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                      {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
                      {String(recordSeconds % 60).padStart(2, "0")}
                    </span>
                  )}
                  {recordSaving && <Loader2 className="h-4 w-4 animate-spin text-[var(--hq-text-muted)]" />}
                </div>
              </div>
              <div className="rounded-md bg-[var(--hq-canvas)] p-3 text-xs text-[var(--hq-text-muted)]">
                Or start a live recorded call through Twilio (rings your phone, then bridges to
                the contact and records once connected — requires Twilio to be connected in
                Settings), or just log a call you already made.
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
                <select
                  className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                  value={callForm.callStageReached}
                  onChange={(e) => setCallForm({ ...callForm, callStageReached: e.target.value })}
                >
                  <option value="">Furthest stage reached (optional) — shows up on the Sales dashboard</option>
                  {Object.entries(STAGE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-[var(--hq-text-muted)]">
                  <input
                    type="checkbox"
                    checked={callForm.qualityNo}
                    onChange={(e) => setCallForm({ ...callForm, qualityNo: e.target.checked })}
                  />
                  Quality no — they objected twice or more but still asked a real question
                </label>
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
                it shows up right here on the lead's timeline. Also paste Zoom's own
                auto-generated transcript below if you have one (Zoom &rarr; Recordings &rarr;
                Audio Transcript) — it's already speaker-labeled and goes straight into Sales
                Coach. No transcript pasted but there's a direct recording link? We'll try
                auto-transcribing it (works for a publicly reachable file; a Zoom link that
                requires signing in to view won't work that way — paste the transcript instead).
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
              <textarea
                placeholder="Paste the Zoom transcript here (optional) — goes straight to Sales Coach"
                rows={4}
                className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
                value={videoForm.transcript}
                onChange={(e) => setVideoForm({ ...videoForm, transcript: e.target.value })}
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

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--hq-text-muted)]">
        Communication Log
      </p>
      <div className="mt-3 space-y-3">
        {interactions.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            No interactions logged yet. This is the shared thread everyone on the team sees.
          </p>
        )}
        {interactions.map((i) => {
          const Icon = TYPE_ICON[i.type];
          const DirIcon = i.direction === "INBOUND" ? ArrowDownLeft : ArrowUpRight;
          // Every row rendered here is already sent/logged — never a draft
          // in progress — so an EMAIL entry's icon should read as neutral,
          // not the accent color. Accent stays reserved for signaling an
          // email that's still being composed/drafted, which isn't a state
          // this list currently has a row for.
          const iconClass =
            i.type === "EMAIL"
              ? "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]"
              : "bg-[var(--hq-accent-soft)] text-[var(--hq-accent)]";
          return (
            <div key={i.id} className="group flex gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
                    <DirIcon className="h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
                    {i.subject || TYPE_LABEL[i.type]}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-xs text-[var(--hq-text-muted)]">
                      {new Date(i.occurredAt).toLocaleString()}
                    </p>
                    {editingId !== i.id && (
                      <>
                        <button
                          onClick={() => startEdit(i)}
                          title="Edit this entry"
                          className="opacity-0 transition group-hover:opacity-100"
                        >
                          <Pencil className="h-3.5 w-3.5 text-neutral-500 hover:text-[var(--hq-accent)]" />
                        </button>
                        <button
                          onClick={() => deleteInteraction(i.id)}
                          disabled={deletingId === i.id}
                          title="Delete this entry"
                          className="opacity-0 transition group-hover:opacity-100 disabled:opacity-100"
                        >
                          {deletingId === i.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--hq-text-muted)]" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-neutral-500 hover:text-red-500" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingId === i.id ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-[var(--hq-accent)] bg-[var(--hq-canvas)] p-3">
                    <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
                      When
                      <input
                        type="datetime-local"
                        value={editForm.occurredAt}
                        onChange={(e) => setEditForm({ ...editForm, occurredAt: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm text-[var(--hq-text)]"
                      />
                    </label>
                    {(i.type === "EMAIL" || i.subject !== null) && (
                      <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
                        Subject
                        <input
                          type="text"
                          value={editForm.subject}
                          onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm text-[var(--hq-text)]"
                        />
                      </label>
                    )}
                    <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
                      Notes
                      <textarea
                        rows={3}
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-sm text-[var(--hq-text)]"
                      />
                    </label>
                    {(i.type === "CALL" || i.type === "VIDEO_CALL") && (
                      <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
                        Transcript
                        <textarea
                          rows={5}
                          value={editForm.transcript}
                          onChange={(e) => setEditForm({ ...editForm, transcript: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1 font-mono text-xs text-[var(--hq-text)]"
                        />
                      </label>
                    )}
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(i)}
                        disabled={editSaving}
                        className="flex items-center gap-1 rounded-md bg-[var(--hq-accent)] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={editSaving}
                        className="flex items-center gap-1 rounded-md border border-[var(--hq-card-border)] px-3 py-1 text-xs font-medium text-[var(--hq-text-muted)]"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  i.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--hq-text-muted)]">{i.body}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--hq-text-muted)]">
                  <span>{i.user?.name || i.user?.email || "Auto-logged"}</span>
                  {i.durationSeconds != null && <span>{Math.round(i.durationSeconds / 60)} min</span>}
                  {i.type === "CALL" && (
                    <span className="flex items-center gap-1">
                      <select
                        value={i.callStageReached || ""}
                        onChange={(e) => setCallStage(i.id, e.target.value || null)}
                        disabled={outcomeUpdatingId === i.id}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          i.callStageReached
                            ? "border-[var(--hq-accent)] text-[var(--hq-accent)]"
                            : "border-[var(--hq-card-border)] text-[var(--hq-text-muted)]"
                        }`}
                      >
                        <option value="">Set stage reached…</option>
                        {Object.entries(STAGE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {outcomeUpdatingId === i.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    </span>
                  )}
                  {i.recordingUrl && (
                    <a href={i.recordingUrl} target="_blank" className="font-medium text-[var(--hq-accent)] hover:underline">
                      {i.type === "VIDEO_CALL" ? "Watch recording" : "Play recording"}
                    </a>
                  )}
                  {(i.transcriptStatus === "PENDING" || i.transcriptStatus === "PROCESSING") && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Transcribing…
                    </span>
                  )}
                  {i.transcriptStatus === "FAILED" && (
                    <span className="text-red-600" title={i.transcriptError || undefined}>
                      Transcription failed
                    </span>
                  )}
                  {i.transcriptStatus === "DONE" && i.transcript && (
                    <button
                      onClick={() => setExpandedTranscriptId(expandedTranscriptId === i.id ? null : i.id)}
                      className="flex items-center gap-1 font-medium text-[var(--hq-accent)] hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      {expandedTranscriptId === i.id ? "Hide transcript" : "View transcript"}
                      {expandedTranscriptId === i.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
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
                {expandedTranscriptId === i.id && i.transcript && (
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-3">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--hq-text-muted)]">
                      {i.transcript}
                    </p>
                  </div>
                )}
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
