"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, RefreshCw, Sparkles, Instagram, Ticket, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

type EventRow = {
  id: string;
  name: string;
  eventDate: string;
  pricing: "PAID" | "FREE";
  platform: "ZEFFY" | "PARTIFUL";
  zeffyCampaignId: string | null;
  ticketsSold: number | null;
  revenue: number | null;
  rsvpCount: number | null;
  notes: string | null;
  posts: { id: string; caption: string | null; thumbnailUrl: string | null; contentCategory: string | null }[];
};

type PostRow = {
  id: string;
  igMediaId: string;
  permalink: string | null;
  mediaType: string | null;
  caption: string | null;
  transcript: string | null;
  transcriptStatus: "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "SKIPPED";
  transcriptError: string | null;
  contentCategory: string | null;
  categoryReasoning: string | null;
  thumbnailUrl: string | null;
  postedAt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  events: { id: string; name: string }[];
};

const STATUS_LABEL: Record<PostRow["transcriptStatus"], string> = {
  PENDING: "Queued for transcription",
  PROCESSING: "Transcribing…",
  DONE: "Transcribed",
  FAILED: "Transcription failed",
  SKIPPED: "Not a video",
};

const STATUS_COLOR: Record<PostRow["transcriptStatus"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  DONE: "bg-emerald-50 text-[var(--hq-positive)]",
  FAILED: "bg-red-50 text-[var(--hq-negative)]",
  SKIPPED: "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]",
};

function EventForm({ zeffyConnected, onCreated }: { zeffyConnected: boolean; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    eventDate: "",
    pricing: "PAID" as "PAID" | "FREE",
    platform: "ZEFFY" as "ZEFFY" | "PARTIFUL",
    zeffyCampaignId: "",
    rsvpCount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        rsvpCount: form.rsvpCount ? Number(form.rsvpCount) : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong.");
      return;
    }
    setForm({ name: "", eventDate: "", pricing: "PAID", platform: "ZEFFY", zeffyCampaignId: "", rsvpCount: "" });
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white"
      >
        <Plus className="h-3.5 w-3.5" /> Log an event
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex gap-2">
        <input
          required
          placeholder="Event name"
          className="flex-1 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          type="date"
          className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={form.eventDate}
          onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <select
          className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={form.pricing}
          onChange={(e) => setForm({ ...form, pricing: e.target.value as "PAID" | "FREE" })}
        >
          <option value="PAID">Paid</option>
          <option value="FREE">Free</option>
        </select>
        <select
          className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value as "ZEFFY" | "PARTIFUL" })}
        >
          <option value="ZEFFY">Zeffy (tickets auto-sync)</option>
          <option value="PARTIFUL">Partiful (RSVPs, manual)</option>
        </select>
      </div>
      {form.platform === "ZEFFY" && (
        <input
          placeholder={zeffyConnected ? "Zeffy campaign id (optional — fill in once known)" : "Connect Zeffy in Settings to auto-sync"}
          className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={form.zeffyCampaignId}
          onChange={(e) => setForm({ ...form, zeffyCampaignId: e.target.value })}
        />
      )}
      {form.platform === "PARTIFUL" && (
        <input
          type="number"
          placeholder="RSVP count"
          className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={form.rsvpCount}
          onChange={(e) => setForm({ ...form, rsvpCount: e.target.value })}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Saving…" : "Save event"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm text-[var(--hq-text-muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}

function EventCard({ event, posts, onChanged }: { event: EventRow; posts: PostRow[]; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rsvp, setRsvp] = useState(String(event.rsvpCount ?? ""));

  async function saveRsvp() {
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpCount: rsvp ? Number(rsvp) : null }),
    });
    onChanged();
  }

  async function removeEvent() {
    if (!confirm(`Delete "${event.name}"? This won't delete its linked Reels.`)) return;
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    onChanged();
  }

  const linkedCount = event.posts.length;

  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-[var(--hq-text)]">{event.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${event.pricing === "PAID" ? "bg-emerald-50 text-[var(--hq-positive)]" : "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]"}`}>
              {event.pricing === "PAID" ? "Paid" : "Free"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
            {new Date(event.eventDate).toLocaleDateString()} · {linkedCount} linked reel{linkedCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {event.platform === "ZEFFY" ? (
            <div className="text-right text-xs">
              <p className="font-semibold text-[var(--hq-text)]">{event.ticketsSold ?? "—"} tickets</p>
              <p className="text-[var(--hq-text-muted)]">${(event.revenue ?? 0).toFixed(0)}</p>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="RSVPs"
                className="w-20 rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-xs"
                value={rsvp}
                onChange={(e) => setRsvp(e.target.value)}
                onBlur={saveRsvp}
              />
            </div>
          )}
          <button onClick={() => setExpanded((v) => !v)} className="text-[var(--hq-text-muted)]">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-[var(--hq-card-border)] pt-3">
          {event.platform === "ZEFFY" && (
            <p className="text-xs text-[var(--hq-text-muted)]">
              Zeffy campaign: {event.zeffyCampaignId || "not linked — set one from the event's edit flow to auto-sync"}
            </p>
          )}
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
            Linked reels
          </p>
          {event.posts.length === 0 && <p className="mt-1 text-xs text-[var(--hq-text-muted)]">None yet — link a Reel to this event from the content feed below.</p>}
          <div className="mt-1 flex flex-wrap gap-2">
            {event.posts.map((p) => (
              <span key={p.id} className="rounded-full bg-[var(--hq-canvas)] px-2 py-1 text-[10px] text-[var(--hq-text-muted)]">
                {p.contentCategory || "uncategorized"}
              </span>
            ))}
          </div>
          <button onClick={removeEvent} className="mt-3 text-xs text-[var(--hq-text-muted)] hover:text-red-600">
            Delete event
          </button>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, events, onChanged }: { post: PostRow; events: EventRow[]; onChanged: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [linkedIds, setLinkedIds] = useState<string[]>(post.events.map((e) => e.id));
  const [saving, setSaving] = useState(false);

  async function toggleEvent(id: string) {
    const next = linkedIds.includes(id) ? linkedIds.filter((x) => x !== id) : [...linkedIds, id];
    setLinkedIds(next);
    setSaving(true);
    await fetch(`/api/content-posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: next }),
    });
    setSaving(false);
    onChanged();
  }

  async function retranscribe() {
    await fetch(`/api/content-posts/${post.id}/retranscribe`, { method: "POST" });
    onChanged();
  }

  return (
    <div className="flex gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      {post.thumbnailUrl && (
        <img src={post.thumbnailUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm text-[var(--hq-text)]">{post.caption || "(no caption)"}</p>
          {post.permalink && (
            <a href={post.permalink} target="_blank" className="shrink-0 text-[var(--hq-accent)]">
              <Instagram className="h-4 w-4" />
            </a>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[post.transcriptStatus]}`}>
            {STATUS_LABEL[post.transcriptStatus]}
          </span>
          {post.contentCategory && (
            <span title={post.categoryReasoning || ""} className="rounded-full bg-[var(--hq-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--hq-accent)]">
              {post.contentCategory}
            </span>
          )}
          {post.transcriptStatus === "FAILED" && (
            <button onClick={retranscribe} className="text-[10px] text-[var(--hq-text-muted)] underline">
              Retry
            </button>
          )}
        </div>
        <div className="mt-1.5 flex gap-3 text-xs text-[var(--hq-text-muted)]">
          <span>{post.views ?? "—"} views</span>
          <span>{post.likes ?? "—"} likes</span>
          <span>{post.comments ?? "—"} comments</span>
          <span>{post.shares ?? "—"} shares</span>
        </div>
        {post.transcript && (
          <button onClick={() => setShowTranscript((v) => !v)} className="mt-1.5 text-xs text-[var(--hq-accent)] hover:underline">
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
        )}
        {showTranscript && post.transcript && (
          <p className="mt-1 whitespace-pre-wrap rounded-md bg-[var(--hq-canvas)] p-2 text-xs text-[var(--hq-text-muted)]">
            {post.transcript}
          </p>
        )}
        {events.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {events.map((ev) => {
              const active = linkedIds.includes(ev.id);
              return (
                <button
                  key={ev.id}
                  disabled={saving}
                  onClick={() => toggleEvent(ev.id)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    active
                      ? "border-[var(--hq-accent)] bg-[var(--hq-accent)] text-white"
                      : "border-[var(--hq-card-border)] text-[var(--hq-text-muted)]"
                  }`}
                >
                  {ev.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryBreakdown({ posts, events }: { posts: PostRow[]; events: EventRow[] }) {
  const rows = useMemo(() => {
    const byCategory = new Map<string, { views: number; count: number; linkedEvents: Set<string> }>();
    for (const p of posts) {
      const cat = p.contentCategory || "uncategorized";
      const entry = byCategory.get(cat) || { views: 0, count: 0, linkedEvents: new Set<string>() };
      entry.views += p.views || 0;
      entry.count += 1;
      p.events.forEach((e) => entry.linkedEvents.add(e.id));
      byCategory.set(cat, entry);
    }
    return Array.from(byCategory.entries())
      .map(([category, v]) => ({
        category,
        avgViews: v.count > 0 ? Math.round(v.views / v.count) : 0,
        count: v.count,
        eventsSold: v.linkedEvents.size,
      }))
      .sort((a, b) => b.avgViews - a.avgViews);
  }, [posts]);

  if (rows.length === 0) return null;
  const maxViews = Math.max(...rows.map((r) => r.avgViews), 1);

  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
        Avg views by content category
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.category} className="flex items-center gap-2 text-xs">
            <span className="w-40 shrink-0 truncate text-[var(--hq-text-muted)]">{r.category}</span>
            <div className="h-1.5 flex-1 rounded-full bg-[var(--hq-canvas)]">
              <div className="h-1.5 rounded-full bg-[var(--hq-accent)]" style={{ width: `${(r.avgViews / maxViews) * 100}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right font-medium text-[var(--hq-text)]">{r.avgViews.toLocaleString()}</span>
            <span className="w-20 shrink-0 text-right text-[var(--hq-text-muted)]">{r.count} post{r.count === 1 ? "" : "s"}</span>
            <span className="w-24 shrink-0 text-right text-[var(--hq-text-muted)]">{r.eventsSold} event{r.eventsSold === 1 ? "" : "s"} linked</span>
          </div>
        ))}
      </div>
      {events.length === 0 && (
        <p className="mt-2 text-xs text-[var(--hq-text-muted)]">Log an event above and link reels to it to see how views connect to actual sales.</p>
      )}
    </div>
  );
}

export function PerformanceShell({
  initialEvents,
  initialPosts,
  instagramConnected,
  instagramConfigured,
  zeffyConnected,
}: {
  initialEvents: EventRow[];
  initialPosts: PostRow[];
  instagramConnected: boolean;
  instagramConfigured: boolean;
  zeffyConnected: boolean;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [posts, setPosts] = useState(initialPosts);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState<string | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  async function refresh() {
    const [eventsRes, postsRes] = await Promise.all([fetch("/api/events"), fetch("/api/content-posts")]);
    setEvents((await eventsRes.json()).events || []);
    setPosts((await postsRes.json()).posts || []);
    router.refresh();
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMessage(null);
    const res = await fetch("/api/performance/sync-now", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setSyncing(false);
    const igCount = Array.isArray(d.instagram) ? d.instagram.length : 0;
    setSyncMessage(d.instagram?.error ? `Instagram: ${d.instagram.error}` : `Synced ${igCount} Instagram post${igCount === 1 ? "" : "s"}.`);
    refresh();
  }

  async function analyze() {
    setAnalyzing(true);
    setAssessmentError(null);
    const res = await fetch("/api/performance/analyze", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setAnalyzing(false);
    if (!res.ok) {
      setAssessmentError(d.error || "Something went wrong.");
      return;
    }
    setAssessment(d.assessment);
  }

  useEffect(() => {
    setEvents(initialEvents);
    setPosts(initialPosts);
  }, [initialEvents, initialPosts]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
            <TrendingUp className="h-6 w-6 text-[var(--hq-accent)]" />
            Content Performance
          </h1>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
            What you post on Reels, matched against actual ticket sales and RSVPs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncNow}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-full border border-[var(--hq-card-border)] px-3 py-1.5 text-sm font-medium text-[var(--hq-text)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
          <button
            onClick={analyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> {analyzing ? "Analyzing…" : "Analyze what's working"}
          </button>
        </div>
      </div>
      {syncMessage && <p className="mt-2 text-xs text-[var(--hq-text-muted)]">{syncMessage}</p>}

      {(!instagramConnected || !zeffyConnected) && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {!instagramConnected && (
            <p>
              Instagram isn&apos;t connected yet{instagramConfigured ? "" : " (needs a Meta app first)"} — reels won&apos;t sync
              until you connect it in{" "}
              <a href="/dashboard/settings" className="underline">
                Settings
              </a>
              .
            </p>
          )}
          {!zeffyConnected && (
            <p>
              Zeffy isn&apos;t connected — ticket totals won&apos;t auto-update until you add an API key in{" "}
              <a href="/dashboard/settings" className="underline">
                Settings
              </a>
              .
            </p>
          )}
        </div>
      )}

      {assessment && (
        <div className="mt-4 rounded-xl border border-[var(--hq-accent)] bg-[var(--hq-accent-soft)] p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--hq-accent)]">
            <Sparkles className="h-3.5 w-3.5" /> Assessment
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--hq-text)]">{assessment}</p>
          <button onClick={() => setAssessment(null)} className="mt-2 text-xs text-[var(--hq-text-muted)]">
            <X className="inline h-3 w-3" /> Dismiss
          </button>
        </div>
      )}
      {assessmentError && <p className="mt-2 text-sm text-red-600">{assessmentError}</p>}

      <p className="mt-6 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
        <Ticket className="h-3.5 w-3.5" /> Events
      </p>
      <EventForm zeffyConnected={zeffyConnected} onCreated={refresh} />
      <div className="mt-3 space-y-2">
        {events.length === 0 && <p className="text-sm text-[var(--hq-text-muted)]">No events logged yet.</p>}
        {events.map((e) => (
          <EventCard key={e.id} event={e} posts={posts} onChanged={refresh} />
        ))}
      </div>

      <p className="mt-8 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
        Correlation
      </p>
      <div className="mt-2">
        <CategoryBreakdown posts={posts} events={events} />
      </div>

      <p className="mt-8 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
        Reels ({posts.length})
      </p>
      <div className="mt-2 space-y-3">
        {posts.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            Nothing synced yet — connect Instagram in Settings, then hit &quot;Sync now&quot; above.
          </p>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} events={events} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}
