"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Video, Send, Sparkles, FileText, ChevronDown, ChevronUp, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";

type Call = {
  id: string;
  type: "CALL" | "VIDEO_CALL";
  direction: "INBOUND" | "OUTBOUND";
  occurredAt: string;
  durationSeconds: number | null;
  transcript: string;
  contact: { id: string; companyName: string | null; contactName: string } | null;
  coachingNotes: string | null;
  coachingStrengthTags: string[];
  coachingIssueTags: string[];
  coachingGeneratedAt: string | null;
};

type PatternTag = { key: string; label: string; count: number };
type Patterns = { analyzedCount: number; totalCount: number; issues: PatternTag[]; strengths: PatternTag[] };
type PatternsByKind = { coldCall: Patterns; discovery: Patterns };

function PatternPanel({ title, goal, patterns }: { title: string; goal: string; patterns: Patterns }) {
  if (patterns.issues.length === 0 && patterns.strengths.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--hq-text)]">
        {title}
        <span className="ml-2 text-xs font-normal text-[var(--hq-text-muted)]">
          across {patterns.analyzedCount} analyzed call{patterns.analyzedCount === 1 ? "" : "s"}
          {patterns.totalCount > patterns.analyzedCount ? ` (${patterns.totalCount - patterns.analyzedCount} not analyzed yet)` : ""}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">{goal}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1 text-xs font-medium text-red-600">
            <ThumbsDown className="h-3.5 w-3.5" /> Keeps going wrong
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {patterns.issues.length === 0 && (
              <span className="text-xs text-[var(--hq-text-muted)]">Nothing recurring yet.</span>
            )}
            {patterns.issues.map((t) => (
              <span
                key={t.key}
                className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                title={t.label}
              >
                {t.label} ×{t.count}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ThumbsUp className="h-3.5 w-3.5" /> Keeps going well
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {patterns.strengths.length === 0 && (
              <span className="text-xs text-[var(--hq-text-muted)]">Nothing recurring yet.</span>
            )}
            {patterns.strengths.map((t) => (
              <span
                key={t.key}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                title={t.label}
              >
                {t.label} ×{t.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "What went well on this call?",
  "What did I miss or handle badly?",
  "How could I have handled the objection better?",
  "Write a short follow-up email based on this call.",
];

export function SalesCoachView({ calls: initialCalls, patterns }: { calls: Call[]; patterns: PatternsByKind }) {
  const router = useRouter();
  const [calls, setCalls] = useState(initialCalls);
  const [selectedId, setSelectedId] = useState<string | null>(initialCalls[0]?.id || null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [messagesByCall, setMessagesByCall] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => calls.find((c) => c.id === selectedId) || null, [calls, selectedId]);
  const messages = (selected && messagesByCall[selected.id]) || [];

  function selectCall(id: string) {
    setSelectedId(id);
    setTranscriptOpen(false);
    setError(null);
    setAnalyzeError(null);
  }

  async function analyze() {
    if (!selected) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/sales-coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error || "Couldn't analyze this call.");
        return;
      }
      setCalls((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...data } : c)));
      router.refresh(); // picks up the updated pattern counts below
    } catch {
      setAnalyzeError("Couldn't reach the sales coach. Check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function send(text: string) {
    if (!selected) return;
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessagesByCall((prev) => ({ ...prev, [selected.id]: next }));
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sales-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, interactionId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setMessagesByCall((prev) => ({ ...prev, [selected.id]: [...next, { role: "assistant", content: data.reply }] }));
      }
    } catch {
      setError("Couldn't reach the sales coach. Check your connection and try again.");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-8 text-center text-sm text-[var(--hq-text-muted)]">
        No transcribed calls yet. Record a call through a lead&apos;s timeline (Call &amp; record),
        or log a Zoom discovery call with its transcript pasted in — both show up here once
        transcribed.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PatternPanel
        title="Cold call patterns"
        goal="Goal of a cold call: get booked on the video call — not to close."
        patterns={patterns.coldCall}
      />
      <PatternPanel
        title="Video call patterns"
        goal="Goal of a video call: close the deal — the cold call already got them here."
        patterns={patterns.discovery}
      />

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-1.5">
          {calls.map((c) => {
            const Icon = c.type === "CALL" ? Phone : Video;
            const name = c.contact?.companyName || c.contact?.contactName || "Unknown lead";
            const isActive = selected?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => selectCall(c.id)}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-[var(--hq-accent)] bg-[var(--hq-accent-soft)]"
                    : "border-[var(--hq-card-border)] bg-white hover:border-[var(--hq-accent)]/50"
                }`}
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--hq-text-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[var(--hq-text)]">{name}</span>
                  <span className="block text-xs text-[var(--hq-text-muted)]">
                    {new Date(c.occurredAt).toLocaleDateString()}
                    {c.durationSeconds != null ? ` · ${Math.round(c.durationSeconds / 60)} min` : ""}
                  </span>
                  {!c.coachingGeneratedAt && (
                    <span className="mt-0.5 block text-[11px] text-[var(--hq-accent)]">Not analyzed yet</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div>
          {selected && (
            <div className="rounded-xl border border-[var(--hq-card-border)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--hq-card-border)] px-4 py-2.5">
                <p className="text-sm font-medium text-[var(--hq-text)]">
                  {selected.contact?.companyName || selected.contact?.contactName || "Unknown lead"}
                  <span className="ml-2 text-xs text-[var(--hq-text-muted)]">
                    {new Date(selected.occurredAt).toLocaleString()}
                  </span>
                </p>
                <button
                  onClick={() => setTranscriptOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--hq-accent)] hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {transcriptOpen ? "Hide transcript" : "View transcript"}
                  {transcriptOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {transcriptOpen && (
                <div className="max-h-56 overflow-y-auto border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-4">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--hq-text-muted)]">
                    {selected.transcript}
                  </p>
                </div>
              )}

              <div className="border-b border-[var(--hq-card-border)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hq-text-muted)]">
                    Saved analysis
                  </p>
                  <button
                    onClick={analyze}
                    disabled={analyzing}
                    className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] px-3 py-1 text-xs font-medium text-[var(--hq-text)] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${analyzing ? "animate-spin" : ""}`} />
                    {analyzing ? "Analyzing…" : selected.coachingGeneratedAt ? "Re-analyze" : "Analyze this call"}
                  </button>
                </div>
                {analyzeError && <p className="mt-2 text-xs text-red-600">{analyzeError}</p>}
                {!selected.coachingGeneratedAt && !analyzeError && (
                  <p className="mt-2 text-xs text-[var(--hq-text-muted)]">
                    Not analyzed yet — one click saves the takeaways here for good, and feeds the
                    patterns panel above.
                  </p>
                )}
                {selected.coachingGeneratedAt && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-[var(--hq-text)]">{selected.coachingNotes}</p>
                    {(selected.coachingStrengthTags.length > 0 || selected.coachingIssueTags.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.coachingStrengthTags.map((k) => (
                          <span key={k} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            {k.replace(/_/g, " ")}
                          </span>
                        ))}
                        {selected.coachingIssueTags.map((k) => (
                          <span key={k} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            {k.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-[var(--hq-text-muted)]">
                      Analyzed {new Date(selected.coachingGeneratedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex min-h-[300px] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
                        <Sparkles className="h-3.5 w-3.5 text-[var(--hq-accent)]" /> Dig deeper:
                      </p>
                      {STARTER_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
                          className="w-fit rounded-full border border-[var(--hq-card-border)] px-3 py-1.5 text-left text-xs text-[var(--hq-text)] hover:bg-[var(--hq-canvas)]"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-[var(--hq-accent)] text-white"
                            : "bg-[var(--hq-canvas)] text-[var(--hq-text)]"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-[var(--hq-canvas)] px-3.5 py-2 text-sm text-[var(--hq-text-muted)]">
                        Thinking…
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                  )}
                  <div ref={bottomRef} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="flex items-center gap-2 border-t border-[var(--hq-card-border)] p-3"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about this call…"
                    className="flex-1 rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
                </form>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-[var(--hq-text-muted)]">
            The saved analysis above persists and feeds the patterns panel. The chat below it
            doesn&apos;t — it resets when you leave this page.
          </p>
        </div>
      </div>
    </div>
  );
}
