"use client";

// The live console: run during the discovery call (ideally on Marwa's
// screen while Vlad talks). Captures two audio sources in ~15s chunks:
//   REP    = this computer's microphone
//   CLIENT = the Google Meet tab, shared with "Share tab audio" ticked
// Each chunk is a standalone webm file (a fresh MediaRecorder per chunk,
// so every piece has its own headers and can be decoded on its own).
// Headphones matter: without them the mic also hears the client through
// the speakers and their words get transcribed twice.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FIELD_DEFS, PRICE_TIERS, type Fields, type LiveConcept } from "@/lib/live-proposal";

const CHUNK_MS = 15000;
const POLL_MS = 4000;
const EXTRACT_MS = 60000;
const AUTO_CONCEPTS_AFTER_MS = 12 * 60000;

type Segment = { id: string; speaker: string; text: string; startedAt: string };
type Proposal = {
  id: string;
  title: string;
  status: string;
  callLanguage: string;
  priceTier: string;
  fields: Fields;
  lockedFields: string[];
  concepts: LiveConcept[];
  chosenConcept: number | null;
  extractCount: number;
  lastError: string | null;
  acceptedAt: string | null;
  paymentChoice: string | null;
  activationId: string | null;
  segments: Segment[];
  contact: { id: string; companyName: string | null; contactName: string } | null;
};

function pickMime(): string | undefined {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

// Records `stream` in back-to-back standalone chunks until stopped.
function startChunker(stream: MediaStream, onChunk: (blob: Blob, startedAt: number) => void) {
  let stopped = false;
  let current: MediaRecorder | null = null;
  const mimeType = pickMime();
  const next = () => {
    if (stopped || stream.getAudioTracks().every((t) => t.readyState === "ended")) return;
    const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const parts: Blob[] = [];
    const startedAt = Date.now();
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      if (parts.length) onChunk(new Blob(parts, { type: rec.mimeType || "audio/webm" }), startedAt);
      next();
    };
    rec.start();
    current = rec;
    setTimeout(() => rec.state !== "inactive" && rec.stop(), CHUNK_MS);
  };
  next();
  return () => {
    stopped = true;
    if (current && current.state !== "inactive") current.stop();
  };
}

export function LiveConsole({ id, initialTitle }: { id: string; initialTitle: string }) {
  const [p, setP] = useState<Proposal | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capStart, setCapStart] = useState<number | null>(null);
  const [sources, setSources] = useState({ mic: false, tab: false });
  const [pending, setPending] = useState(0);
  // Off when someone other than the presenter runs the console from their
  // own laptop while sitting in the Meet: the shared tab then carries both
  // sides of the conversation, and their own mic would only add noise.
  const [useMic, setUseMic] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"" | "extract" | "concepts">("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const focused = useRef<string | null>(null);
  const stops = useRef<(() => void)[]>([]);
  const streams = useRef<MediaStream[]>([]);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/live-proposals/${id}`);
    if (!res.ok) return;
    const { proposal } = (await res.json()) as { proposal: Proposal };
    setP(proposal);
    setDrafts((d) => {
      const next = { ...d };
      for (const f of FIELD_DEFS) if (focused.current !== f.key) next[f.key] = proposal.fields?.[f.key]?.value || "";
      return next;
    });
  }, [id]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const [mins, setMins] = useState(0);
  useEffect(() => {
    if (!capStart) return;
    const t = setInterval(() => setMins(Math.floor((Date.now() - capStart) / 60000)), 15000);
    return () => clearInterval(t);
  }, [capStart]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: "end" });
  }, [p?.segments.length]);

  const extract = useCallback(async () => {
    setBusy("extract");
    const res = await fetch(`/api/live-proposals/${id}/extract`, { method: "POST" });
    setBusy("");
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error || "Update failed.");
    load();
  }, [id, load]);

  const draftConcepts = useCallback(async () => {
    setBusy("concepts");
    setMsg("Drafting 3 concepts…");
    const res = await fetch(`/api/live-proposals/${id}/concepts`, { method: "POST" });
    setBusy("");
    setMsg(res.ok ? "" : (await res.json().catch(() => ({}))).error || "Concepts failed.");
    load();
  }, [id, load]);

  // While capturing: refresh fields every minute; draft concepts once at ~12 min.
  const autoConceptsDone = useRef(false);
  useEffect(() => {
    if (!capturing) return;
    const t = setInterval(() => {
      extract();
      if (!autoConceptsDone.current && capStart && Date.now() - capStart > AUTO_CONCEPTS_AFTER_MS && !(p?.concepts?.length)) {
        autoConceptsDone.current = true;
        draftConcepts();
      }
    }, EXTRACT_MS);
    return () => clearInterval(t);
  }, [capturing, capStart, extract, draftConcepts, p?.concepts?.length]);

  async function upload(blob: Blob, speaker: "REP" | "CLIENT", startedAt: number) {
    const form = new FormData();
    form.append("audio", blob, "chunk.webm");
    form.append("speaker", speaker);
    form.append("startedAt", String(startedAt));
    setPending((n) => n + 1);
    try {
      const res = await fetch(`/api/live-proposals/${id}/chunk`, { method: "POST", body: form });
      if (!res.ok) setMsg((await res.json().catch(() => ({}))).error || "A chunk failed to transcribe.");
    } finally {
      setPending((n) => n - 1);
    }
  }

  async function startCapture() {
    setMsg("");
    try {
      const mic = useMic ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }) : null;
      let tab: MediaStream | null = null;
      try {
        tab = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch {
        setMsg("Meeting tab not shared: only your mic is being transcribed.");
      }
      const tabAudio = tab && tab.getAudioTracks().length ? new MediaStream(tab.getAudioTracks()) : null;
      if (tab && !tabAudio) setMsg('No tab audio: stop and share again with "Share tab audio" ticked.');
      if (!mic && !tabAudio) {
        tab?.getTracks().forEach((t) => t.stop());
        setMsg("Nothing to listen to: share the meeting tab with audio, or turn on your mic.");
        return;
      }
      streams.current = [...(mic ? [mic] : []), ...(tab ? [tab] : [])];
      stops.current = [];
      if (mic) stops.current.push(startChunker(mic, (b, at) => upload(b, "REP", at)));
      if (tabAudio) stops.current.push(startChunker(tabAudio, (b, at) => upload(b, "CLIENT", at)));
      setSources({ mic: !!mic, tab: !!tabAudio });
      setCapturing(true);
      setCapStart(Date.now());
      tab?.getVideoTracks()[0]?.addEventListener("ended", () => setSources((s) => ({ ...s, tab: false })));
    } catch {
      setMsg("Microphone permission was blocked.");
    }
  }

  function stopCapture() {
    stops.current.forEach((s) => s());
    streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    stops.current = [];
    streams.current = [];
    setCapturing(false);
    setSources({ mic: false, tab: false });
    setTimeout(extract, 3000);
  }
  useEffect(() => () => { stops.current.forEach((s) => s()); streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop())); }, []);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/live-proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  if (!p) return <p className="text-sm text-[var(--hq-text-muted)]">Loading {initialTitle}…</p>;

  const askNext = FIELD_DEFS.filter((f) => !p.fields?.[f.key]?.value).slice(0, 4);
  const filled = FIELD_DEFS.filter((f) => p.fields?.[f.key]?.value).length;
  const concept = p.concepts?.[p.chosenConcept ?? 0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/live-proposal" className="text-xs text-[var(--hq-text-muted)]">← Live Proposal</Link>
          <h1 className="text-2xl font-semibold text-[var(--hq-text)]">{p.title}</h1>
          <p className="text-xs text-[var(--hq-text-muted)]">
            {filled}/{FIELD_DEFS.length} fields · {p.segments.length} transcript lines · {p.extractCount} AI updates
            {capturing ? ` · live ${mins} min` : ""}{pending ? ` · transcribing ${pending}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={p.callLanguage} onChange={(e) => patch({ callLanguage: e.target.value })} className="rounded-lg border border-[var(--hq-card-border)] bg-transparent px-2 py-2 text-sm">
            <option value="english">English</option>
            <option value="french">French</option>
          </select>
          <select value={p.priceTier} onChange={(e) => patch({ priceTier: e.target.value })} className="rounded-lg border border-[var(--hq-card-border)] bg-transparent px-2 py-2 text-sm">
            {Object.entries(PRICE_TIERS).map(([k, t]) => (
              <option key={k} value={k}>{t.label}: ${t.price.toLocaleString()}</option>
            ))}
          </select>
          {!capturing && (
            <label className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)]">
              <input type="checkbox" checked={useMic} onChange={(e) => setUseMic(e.target.checked)} /> my mic
            </label>
          )}
          {capturing ? (
            <button onClick={stopCapture} className="rounded-lg bg-[var(--hq-negative)] px-4 py-2 text-sm font-medium text-white">Stop listening</button>
          ) : (
            <button onClick={startCapture} className="rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white">Start listening</button>
          )}
          <a href={`/present/${id}`} target="_blank" className="rounded-lg border border-[var(--hq-card-border)] px-4 py-2 text-sm text-[var(--hq-text)]">Open deck ↗</a>
        </div>
      </div>

      {(msg || p.lastError) && <p className="rounded-lg border border-[var(--hq-card-border)] px-3 py-2 text-sm text-[var(--hq-negative)]">{msg || p.lastError}</p>}
      {capturing && (
        <p className="text-xs text-[var(--hq-text-muted)]">
          Mic {sources.mic ? "on" : "off"} · Meeting tab {sources.tab ? "on" : "off"}. Wear headphones so the client isn&apos;t transcribed twice. Tell the client you&apos;re taking AI notes.
        </p>
      )}
      {p.acceptedAt && (
        <p className="rounded-lg border border-[var(--hq-positive)] px-3 py-2 text-sm text-[var(--hq-positive)]">
          Accepted ({p.paymentChoice === "PAY_IN_FULL" ? "pay in full" : "20/40/40"}).{" "}
          {p.activationId ? <Link href={`/dashboard/activations/${p.activationId}`} className="underline">Open the Activation to send the agreement + invoice →</Link> : "Link a lead to create the Activation."}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Transcript */}
        <div className="flex h-[70vh] flex-col rounded-xl border border-[var(--hq-card-border)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Transcript</p>
            <button onClick={extract} disabled={!!busy} className="text-xs text-[var(--hq-accent)] disabled:opacity-50">{busy === "extract" ? "Updating…" : "Update fields now"}</button>
          </div>
          <div className="mt-2 flex-1 overflow-y-auto text-sm">
            {p.segments.length === 0 && <p className="text-[var(--hq-text-muted)]">Nothing yet. Press Start listening and share the Meet tab with audio.</p>}
            {p.segments.map((s) => (
              <p key={s.id} className="mb-2">
                <span className={s.speaker === "REP" ? "text-[var(--hq-accent)]" : "text-[var(--hq-positive)]"}>{s.speaker === "REP" ? "Protocol (mic)" : "Meeting"}: </span>
                <span className="text-[var(--hq-text)]">{s.text}</span>
              </p>
            ))}
            <div ref={transcriptEnd} />
          </div>
        </div>

        {/* Fields */}
        <div className="flex h-[70vh] flex-col rounded-xl border border-[var(--hq-card-border)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Ask next</p>
          <ul className="mt-1 mb-3 flex flex-col gap-1 text-sm">
            {askNext.length === 0 ? <li className="text-[var(--hq-positive)]">Everything&apos;s covered. Time to present.</li> : askNext.map((f) => <li key={f.key} className="text-[var(--hq-text)]">→ {f.question}</li>)}
          </ul>
          <div className="flex-1 overflow-y-auto">
            {FIELD_DEFS.map((f) => {
              const locked = p.lockedFields.includes(f.key);
              return (
                <label key={f.key} className="mb-2 block">
                  <span className="flex items-center justify-between text-xs text-[var(--hq-text-muted)]">
                    <span>{f.label}</span>
                    {locked && <button type="button" onClick={() => patch({ unlock: f.key })} className="text-[10px] underline">edited by you · let AI update</button>}
                  </span>
                  <input
                    value={drafts[f.key] ?? ""}
                    onFocus={() => (focused.current = f.key)}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                    onBlur={() => {
                      focused.current = null;
                      if ((drafts[f.key] ?? "") !== (p.fields?.[f.key]?.value || "")) patch({ field: { key: f.key, value: drafts[f.key] ?? "" } });
                    }}
                    title={p.fields?.[f.key]?.quote ? `Heard: "${p.fields[f.key].quote}"` : undefined}
                    className="mt-0.5 w-full rounded-lg border border-[var(--hq-card-border)] bg-transparent px-2 py-1.5 text-sm text-[var(--hq-text)]"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Concepts */}
        <div className="flex h-[70vh] flex-col rounded-xl border border-[var(--hq-card-border)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Concepts</p>
            <button onClick={draftConcepts} disabled={!!busy} className="text-xs text-[var(--hq-accent)] disabled:opacity-50">
              {busy === "concepts" ? "Drafting…" : p.concepts?.length ? "Redraft 3" : "Draft 3 now"}
            </button>
          </div>
          <div className="mt-2 flex-1 overflow-y-auto">
            {!p.concepts?.length && <p className="text-sm text-[var(--hq-text-muted)]">Drafts automatically at about 12 minutes, or press Draft 3 now once you know the space, members and vibe.</p>}
            {p.concepts?.map((c, i) => (
              <button
                key={i}
                onClick={() => patch({ chosenConcept: i })}
                className={`mb-2 block w-full rounded-lg border p-3 text-left ${i === (p.chosenConcept ?? 0) ? "border-[var(--hq-accent)]" : "border-[var(--hq-card-border)]"}`}
              >
                <p className="text-sm font-semibold text-[var(--hq-text)]">{i === (p.chosenConcept ?? 0) ? "● " : ""}{c.name}</p>
                <p className="mt-1 text-sm text-[var(--hq-text)]">{c.headline}</p>
                <p className="mt-1 text-xs text-[var(--hq-text-muted)]">{c.howItWorks}</p>
                {c.basedOn && <p className="mt-1 text-[10px] text-[var(--hq-text-muted)]">From: {c.basedOn}</p>}
              </button>
            ))}
          </div>
          {concept && <p className="mt-2 text-xs text-[var(--hq-text-muted)]">The deck shows: <b className="text-[var(--hq-text)]">{concept.name}</b></p>}
        </div>
      </div>
    </div>
  );
}
