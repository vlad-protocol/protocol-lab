"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  FileText,
  CalendarDays,
  Layers,
  BarChart2,
  Plus,
  Wand2,
  Trash2,
  Send,
  ExternalLink,
  Instagram,
} from "lucide-react";

// --- Types -----------------------------------------------------------------

type Idea = {
  id: string;
  title: string;
  sourceUrl: string | null;
  sourcePlatform: string;
  whyItWorks: string | null;
  hookPattern: string | null;
  status: "INBOX" | "SCRIPTED" | "ARCHIVED";
  scripts: { id: string; title: string; status: string }[];
};

type Script = {
  id: string;
  title: string;
  hook: string;
  body: string;
  closingPrompt: string | null;
  status: "DRAFT" | "APPROVED" | "FILMING" | "EDITING" | "READY" | "POSTED" | "ARCHIVED";
  productionFormat: string | null;
  viralityScore: number | null;
  viralityNotes: string | null;
  idea: { id: string; title: string } | null;
  posts: { id: string; status: string; scheduledFor: string | null }[];
};

type CalendarPost = {
  id: string;
  caption: string | null;
  videoUrl: string | null;
  scheduledFor: string | null;
  status: "SCHEDULED" | "PUBLISHED" | "FAILED";
  publishError: string | null;
  script: { id: string; title: string; hook: string } | null;
  instagramPost: { id: string; permalink: string | null; thumbnailUrl: string | null; views: number | null; likes: number | null } | null;
};

type TopPost = {
  id: string;
  permalink: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

type Carousel = {
  id: string;
  title: string;
  newHooks: string[];
  status: "DRAFT" | "READY" | "POSTED";
  slides: { id: string; position: number; text: string }[];
  sourcePost: TopPost | null;
};

const TABS = [
  { key: "feed", label: "Feed", icon: Lightbulb },
  { key: "scripts", label: "Scripts", icon: FileText },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "carousels", label: "Carousels", icon: Layers },
  { key: "analytics", label: "Analytics", icon: BarChart2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SCRIPT_STATUSES: Script["status"][] = ["DRAFT", "APPROVED", "FILMING", "EDITING", "READY", "POSTED", "ARCHIVED"];

function scoreColor(score: number | null) {
  if (score == null) return "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]";
  if (score >= 75) return "bg-emerald-50 text-[var(--hq-positive)]";
  if (score >= 55) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-[var(--hq-negative)]";
}

// --- Main shell --------------------------------------------------------------

export function ContentEngineShell({
  initialIdeas,
  initialScripts,
  initialPosts,
  initialCarousels,
  topPosts,
  instagramConnected,
  instagramConfigured,
  aiConfigured,
}: {
  initialIdeas: Idea[];
  initialScripts: Script[];
  initialPosts: CalendarPost[];
  initialCarousels: Carousel[];
  topPosts: TopPost[];
  instagramConnected: boolean;
  instagramConfigured: boolean;
  aiConfigured: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("feed");
  const [ideas, setIdeas] = useState(initialIdeas);
  const [scripts, setScripts] = useState(initialScripts);
  const [posts, setPosts] = useState(initialPosts);
  const [carousels, setCarousels] = useState(initialCarousels);

  return (
    <div>
      {!aiConfigured && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ANTHROPIC_API_KEY isn&apos;t set — drafting, scoring, and repurposing won&apos;t work until it&apos;s added in Railway.
        </div>
      )}
      <div className="flex gap-1 rounded-full border border-[var(--hq-card-border)] bg-white p-1 text-sm w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
                tab === t.key ? "bg-[var(--hq-text)] text-white" : "text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "feed" && <FeedTab ideas={ideas} setIdeas={setIdeas} setScripts={setScripts} setTab={setTab} />}
        {tab === "scripts" && <ScriptsTab scripts={scripts} setScripts={setScripts} setPosts={setPosts} setTab={setTab} />}
        {tab === "calendar" && (
          <CalendarTab
            posts={posts}
            setPosts={setPosts}
            scripts={scripts}
            instagramConnected={instagramConnected}
            instagramConfigured={instagramConfigured}
          />
        )}
        {tab === "carousels" && <CarouselsTab carousels={carousels} setCarousels={setCarousels} topPosts={topPosts} />}
        {tab === "analytics" && <AnalyticsTab topPosts={topPosts} />}
      </div>
    </div>
  );
}

// --- Feed (Swipe) ------------------------------------------------------------

function FeedTab({
  ideas,
  setIdeas,
  setScripts,
  setTab,
}: {
  ideas: Idea[];
  setIdeas: React.Dispatch<React.SetStateAction<Idea[]>>;
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
  setTab: (t: TabKey) => void;
}) {
  const [form, setForm] = useState({ title: "", sourceUrl: "", whyItWorks: "" });
  const [submitting, setSubmitting] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);

  async function addIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/content-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      const { idea } = await res.json();
      setIdeas((prev) => [idea, ...prev]);
      setForm({ title: "", sourceUrl: "", whyItWorks: "" });
    }
  }

  async function draftFromIdea(idea: Idea) {
    setDraftingId(idea.id);
    const res = await fetch("/api/content-scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: idea.id }),
    });
    setDraftingId(null);
    if (res.ok) {
      const { script } = await res.json();
      setScripts((prev) => [script, ...prev]);
      setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, status: "SCRIPTED" } : i)));
      setTab("scripts");
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Drafting failed.");
    }
  }

  async function removeIdea(id: string) {
    await fetch(`/api/content-ideas/${id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <form onSubmit={addIdea} className="h-fit rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <p className="text-sm font-medium text-[var(--hq-text)]">Save an idea</p>
        <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
          Yours or a competitor&apos;s — whatever&apos;s worth stealing the angle from.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            placeholder="Title / the core idea"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
          />
          <input
            placeholder="Source URL (optional)"
            value={form.sourceUrl}
            onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            className="rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
          />
          <textarea
            placeholder="Why it works (your own note)"
            value={form.whyItWorks}
            onChange={(e) => setForm((f) => ({ ...f, whyItWorks: e.target.value }))}
            rows={3}
            className="rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !form.title.trim()}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> {submitting ? "Saving…" : "Save idea"}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {ideas.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-6 text-center text-sm text-[var(--hq-text-muted)]">
            No ideas saved yet.
          </p>
        )}
        {ideas.map((idea) => (
          <div key={idea.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--hq-text)]">{idea.title}</p>
                {idea.sourceUrl && (
                  <a
                    href={idea.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 flex items-center gap-1 text-xs text-[var(--hq-accent)]"
                  >
                    {idea.sourceUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {idea.whyItWorks && <p className="mt-1.5 text-sm text-[var(--hq-text-muted)]">{idea.whyItWorks}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {idea.hookPattern && (
                    <span className="rounded-full bg-[var(--hq-canvas)] px-2 py-0.5 text-[11px] text-[var(--hq-text-muted)]">
                      {idea.hookPattern}
                    </span>
                  )}
                  <span className="rounded-full bg-[var(--hq-canvas)] px-2 py-0.5 text-[11px] text-[var(--hq-text-muted)]">
                    {idea.status === "INBOX" ? "Not scripted yet" : idea.status === "SCRIPTED" ? `${idea.scripts.length} script(s)` : "Archived"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => draftFromIdea(idea)}
                  disabled={draftingId === idea.id}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--hq-text)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  <Wand2 className="h-3 w-3" /> {draftingId === idea.id ? "Drafting…" : "Draft script"}
                </button>
                <button onClick={() => removeIdea(idea.id)} className="rounded-full p-1.5 text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Scripts -----------------------------------------------------------------

function ScriptsTab({
  scripts,
  setScripts,
  setPosts,
  setTab,
}: {
  scripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
  setPosts: React.Dispatch<React.SetStateAction<CalendarPost[]>>;
  setTab: (t: TabKey) => void;
}) {
  const [topic, setTopic] = useState("");
  const [drafting, setDrafting] = useState(false);

  async function draftFromTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setDrafting(true);
    const res = await fetch("/api/content-scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    setDrafting(false);
    if (res.ok) {
      const { script } = await res.json();
      setScripts((prev) => [script, ...prev]);
      setTopic("");
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Drafting failed.");
    }
  }

  async function updateScript(id: string, data: Record<string, string>) {
    const res = await fetch(`/api/content-scripts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { script } = await res.json();
      setScripts((prev) => prev.map((s) => (s.id === id ? script : s)));
    }
  }

  async function removeScript(id: string) {
    await fetch(`/api/content-scripts/${id}`, { method: "DELETE" });
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  async function scheduleScript(script: Script) {
    const res = await fetch("/api/content-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptId: script.id, caption: script.hook }),
    });
    if (res.ok) {
      const { post } = await res.json();
      setPosts((prev) => [...prev, { ...post, script: { id: script.id, title: script.title, hook: script.hook }, instagramPost: null }]);
      setTab("calendar");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={draftFromTopic} className="flex items-center gap-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
        <Wand2 className="h-4 w-4 shrink-0 text-[var(--hq-accent)]" />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Draft a script from a bare topic — e.g. 'why most gym memberships go unused'"
          className="flex-1 border-none text-sm outline-none"
        />
        <button
          type="submit"
          disabled={drafting || !topic.trim()}
          className="rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {drafting ? "Drafting…" : "Draft"}
        </button>
      </form>

      {scripts.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-6 text-center text-sm text-[var(--hq-text-muted)]">
          No scripts yet — draft one from an idea in Feed, or straight from a topic above.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {scripts.map((script) => (
          <div key={script.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <input
                defaultValue={script.title}
                onBlur={(e) => e.target.value !== script.title && updateScript(script.id, { title: e.target.value })}
                className="flex-1 border-none bg-transparent text-sm font-medium text-[var(--hq-text)] outline-none"
              />
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${scoreColor(script.viralityScore)}`}>
                {script.viralityScore ?? "—"}
              </span>
            </div>
            {script.idea && <p className="mt-0.5 text-[11px] text-[var(--hq-text-muted)]">From idea: {script.idea.title}</p>}

            <textarea
              defaultValue={script.hook}
              onBlur={(e) => e.target.value !== script.hook && updateScript(script.id, { hook: e.target.value })}
              rows={2}
              className="mt-2 w-full rounded-lg border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] px-2.5 py-1.5 text-sm font-medium"
            />
            <textarea
              defaultValue={script.body}
              onBlur={(e) => e.target.value !== script.body && updateScript(script.id, { body: e.target.value })}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
            />
            <input
              defaultValue={script.closingPrompt || ""}
              onBlur={(e) => e.target.value !== (script.closingPrompt || "") && updateScript(script.id, { closingPrompt: e.target.value })}
              placeholder="Closing comment-prompt"
              className="mt-1.5 w-full rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm italic"
            />
            {script.viralityNotes && (
              <details className="mt-1.5 text-xs text-[var(--hq-text-muted)]">
                <summary className="cursor-pointer select-none">Why this score</summary>
                <pre className="mt-1 whitespace-pre-wrap font-sans">{script.viralityNotes}</pre>
              </details>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                defaultValue={script.status}
                onChange={(e) => updateScript(script.id, { status: e.target.value })}
                className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1 text-xs"
              >
                {SCRIPT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                defaultValue={script.productionFormat || ""}
                onBlur={(e) => e.target.value !== (script.productionFormat || "") && updateScript(script.id, { productionFormat: e.target.value })}
                placeholder="Format (talking head, voiceover…)"
                className="flex-1 rounded-lg border border-[var(--hq-card-border)] px-2 py-1 text-xs"
              />
              <button
                onClick={() => scheduleScript(script)}
                className="flex items-center gap-1 rounded-full bg-[var(--hq-text)] px-2.5 py-1 text-xs font-medium text-white"
              >
                <CalendarDays className="h-3 w-3" /> Schedule
              </button>
              <button onClick={() => removeScript(script.id)} className="rounded-full p-1.5 text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Calendar (Post) -----------------------------------------------------------

function CalendarTab({
  posts,
  setPosts,
  scripts,
  instagramConnected,
  instagramConfigured,
}: {
  posts: CalendarPost[];
  setPosts: React.Dispatch<React.SetStateAction<CalendarPost[]>>;
  scripts: Script[];
  instagramConnected: boolean;
  instagramConfigured: boolean;
}) {
  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function updatePost(id: string, data: Record<string, string | null>) {
    const res = await fetch(`/api/content-calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { post } = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...post } : p)));
    }
  }

  async function removePost(id: string) {
    await fetch(`/api/content-calendar/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  async function publishPost(id: string) {
    setPublishingId(id);
    const res = await fetch(`/api/content-calendar/${id}/publish`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPublishingId(null);
    if (res.ok) {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.post } : p)));
    } else {
      alert(data.error || "Publish failed.");
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "FAILED", publishError: data.error } : p)));
    }
  }

  const sorted = useMemo(
    () => [...posts].sort((a, b) => (a.scheduledFor || "9999").localeCompare(b.scheduledFor || "9999")),
    [posts]
  );

  return (
    <div className="flex flex-col gap-3">
      {!instagramConfigured && (
        <p className="rounded-lg border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] px-3 py-2 text-xs text-[var(--hq-text-muted)]">
          Instagram isn&apos;t connected yet — you can still schedule and fill in posts, but Publish won&apos;t work until it&apos;s set up in Settings.
        </p>
      )}
      {instagramConfigured && !instagramConnected && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Instagram is configured but no account is connected yet — connect it in Settings before publishing.
        </p>
      )}
      {sorted.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-6 text-center text-sm text-[var(--hq-text-muted)]">
          Nothing on the calendar yet — schedule a script from the Scripts tab.
        </p>
      )}
      {sorted.map((post) => (
        <div key={post.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {post.script && <p className="text-sm font-medium text-[var(--hq-text)]">{post.script.title}</p>}
              <textarea
                defaultValue={post.caption || ""}
                onBlur={(e) => e.target.value !== (post.caption || "") && updatePost(post.id, { caption: e.target.value })}
                rows={2}
                placeholder="Caption"
                className="mt-1.5 w-full rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
              />
              <input
                defaultValue={post.videoUrl || ""}
                onBlur={(e) => e.target.value !== (post.videoUrl || "") && updatePost(post.id, { videoUrl: e.target.value })}
                placeholder="Finished video URL (hosted somewhere reachable by Instagram)"
                className="mt-1.5 w-full rounded-lg border border-[var(--hq-card-border)] px-2.5 py-1.5 text-xs"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="datetime-local"
                  defaultValue={post.scheduledFor ? post.scheduledFor.slice(0, 16) : ""}
                  onBlur={(e) => updatePost(post.id, { scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1 text-xs"
                />
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    post.status === "PUBLISHED"
                      ? "bg-emerald-50 text-[var(--hq-positive)]"
                      : post.status === "FAILED"
                      ? "bg-red-50 text-[var(--hq-negative)]"
                      : "bg-[var(--hq-canvas)] text-[var(--hq-text-muted)]"
                  }`}
                >
                  {post.status}
                </span>
                {post.publishError && <span className="text-[11px] text-[var(--hq-negative)]">{post.publishError}</span>}
              </div>
              {post.instagramPost && (
                <a
                  href={post.instagramPost.permalink || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-xs text-[var(--hq-accent)]"
                >
                  <Instagram className="h-3 w-3" /> View live post — {post.instagramPost.views ?? 0} views
                </a>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                onClick={() => publishPost(post.id)}
                disabled={publishingId === post.id || post.status === "PUBLISHED" || !post.videoUrl}
                className="flex items-center gap-1.5 rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                <Send className="h-3 w-3" /> {publishingId === post.id ? "Publishing…" : post.status === "PUBLISHED" ? "Published" : "Publish"}
              </button>
              <button onClick={() => removePost(post.id)} className="rounded-full p-1.5 text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Carousels (Repurpose) -----------------------------------------------------

function CarouselsTab({
  carousels,
  setCarousels,
  topPosts,
}: {
  carousels: Carousel[];
  setCarousels: React.Dispatch<React.SetStateAction<Carousel[]>>;
  topPosts: TopPost[];
}) {
  const [repurposingId, setRepurposingId] = useState<string | null>(null);

  async function repurpose(postId: string) {
    setRepurposingId(postId);
    const res = await fetch("/api/content-carousels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePostId: postId }),
    });
    const data = await res.json().catch(() => ({}));
    setRepurposingId(null);
    if (res.ok) {
      setCarousels((prev) => [data.carousel, ...prev]);
    } else {
      alert(data.error || "Repurposing failed.");
    }
  }

  async function updateCarousel(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/content-carousels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { carousel } = await res.json();
      setCarousels((prev) => prev.map((c) => (c.id === id ? carousel : c)));
    }
  }

  async function removeCarousel(id: string) {
    await fetch(`/api/content-carousels/${id}`, { method: "DELETE" });
    setCarousels((prev) => prev.filter((c) => c.id !== id));
  }

  const alreadyUsed = new Set(carousels.map((c) => c.sourcePost?.id).filter(Boolean));

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="h-fit rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        <p className="text-sm font-medium text-[var(--hq-text)]">Pick a winner to repurpose</p>
        <p className="mt-1 text-xs text-[var(--hq-text-muted)]">Your best-performing synced Reels, ranked by views.</p>
        <div className="mt-3 flex flex-col gap-2">
          {topPosts.length === 0 && <p className="text-xs text-[var(--hq-text-muted)]">No synced posts yet.</p>}
          {topPosts.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[var(--hq-card-border)] p-2">
              <p className="flex-1 truncate text-xs text-[var(--hq-text)]">{p.caption?.slice(0, 50) || p.id}</p>
              <span className="shrink-0 text-[11px] text-[var(--hq-text-muted)]">{p.views ?? 0}v</span>
              <button
                onClick={() => repurpose(p.id)}
                disabled={repurposingId === p.id || alreadyUsed.has(p.id)}
                className="shrink-0 rounded-full bg-[var(--hq-text)] px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
              >
                {repurposingId === p.id ? "…" : alreadyUsed.has(p.id) ? "Done" : "Repurpose"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {carousels.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--hq-card-border)] p-6 text-center text-sm text-[var(--hq-text-muted)]">
            No carousels yet — repurpose a winning post from the left.
          </p>
        )}
        {carousels.map((c) => (
          <CarouselCard key={c.id} carousel={c} onUpdate={updateCarousel} onRemove={removeCarousel} />
        ))}
      </div>
    </div>
  );
}

function CarouselCard({
  carousel,
  onUpdate,
  onRemove,
}: {
  carousel: Carousel;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  const [slides, setSlides] = useState(carousel.slides.map((s) => s.text));

  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <input
          defaultValue={carousel.title}
          onBlur={(e) => e.target.value !== carousel.title && onUpdate(carousel.id, { title: e.target.value })}
          className="flex-1 border-none bg-transparent text-sm font-medium text-[var(--hq-text)] outline-none"
        />
        <select
          defaultValue={carousel.status}
          onChange={(e) => onUpdate(carousel.id, { status: e.target.value })}
          className="rounded-lg border border-[var(--hq-card-border)] px-2 py-1 text-xs"
        >
          <option value="DRAFT">DRAFT</option>
          <option value="READY">READY</option>
          <option value="POSTED">POSTED</option>
        </select>
      </div>

      {carousel.newHooks.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">New hook angles</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-[var(--hq-text)]">
            {carousel.newHooks.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">Slides</p>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {slides.map((text, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-center text-[11px] text-[var(--hq-text-muted)]">{i + 1}</span>
              <input
                value={text}
                onChange={(e) => setSlides((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                className="flex-1 rounded-lg border border-[var(--hq-card-border)] px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setSlides((prev) => [...prev, ""])}
            className="rounded-full bg-[var(--hq-canvas)] px-2.5 py-1 text-[11px] font-medium text-[var(--hq-text-muted)]"
          >
            + slide
          </button>
          <button
            onClick={() => onUpdate(carousel.id, { slides })}
            className="rounded-full bg-[var(--hq-text)] px-2.5 py-1 text-[11px] font-medium text-white"
          >
            Save slides
          </button>
          <button onClick={() => onRemove(carousel.id)} className="ml-auto rounded-full p-1.5 text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)]">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Analytics -----------------------------------------------------------------

function AnalyticsTab({ topPosts }: { topPosts: TopPost[] }) {
  return (
    <div>
      <p className="text-sm text-[var(--hq-text-muted)]">
        Full account-level analytics (reach, followers gained, posting streak) live on the{" "}
        <Link href="/dashboard/performance" className="text-[var(--hq-accent)] underline">
          Content Performance
        </Link>{" "}
        dashboard — this is just your top performers, the ones worth repurposing.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topPosts.map((p) => (
          <div key={p.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
            <p className="line-clamp-2 text-sm text-[var(--hq-text)]">{p.caption || "(no caption)"}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--hq-text-muted)]">
              <span>{p.views ?? 0} views</span>
              <span>{p.likes ?? 0} likes</span>
              <span>{p.comments ?? 0} comments</span>
              <span>{p.shares ?? 0} shares</span>
            </div>
            {p.permalink && (
              <a href={p.permalink} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1 text-xs text-[var(--hq-accent)]">
                View on Instagram <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
