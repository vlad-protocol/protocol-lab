"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Copy, ExternalLink, Trash2 } from "lucide-react";

type Reel = {
  id: string;
  platform: string;
  title: string;
  url: string | null;
  views: number;
  followersGained: number;
  postedAt: string;
  notes: string | null;
};

function scorePer10k(reel: Reel) {
  if (reel.views === 0) return 0;
  return (reel.followersGained / reel.views) * 10000;
}

const PLATFORM_GRADIENT: Record<string, string> = {
  instagram: "from-fuchsia-400 via-rose-400 to-amber-300",
  tiktok: "from-slate-800 via-slate-700 to-slate-500",
  youtube: "from-red-500 to-red-700",
  other: "from-neutral-400 to-neutral-600",
};

function withinRange(dateStr: string, range: "month" | "last") {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "month") return d >= startOfThisMonth;
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d >= startOfLastMonth && d < startOfThisMonth;
}

export default function ContentPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"month" | "last">("month");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    platform: "instagram",
    title: "",
    url: "",
    views: "",
    followersGained: "",
    postedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reels");
    const data = await res.json();
    setReels(data.reels || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/reels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        views: Number(form.views) || 0,
        followersGained: Number(form.followersGained) || 0,
      }),
    });
    setForm((f) => ({ ...f, title: "", url: "", views: "", followersGained: "", notes: "" }));
    setSubmitting(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reels/${id}`, { method: "DELETE" });
    load();
  }

  function handleCopy(reel: Reel) {
    navigator.clipboard?.writeText(reel.title);
    setCopiedId(reel.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  const filtered = useMemo(
    () => reels.filter((r) => withinRange(r.postedAt, range)),
    [reels, range]
  );
  const ranked = [...filtered].sort((a, b) => scorePer10k(b) - scorePer10k(a));

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
            <Flame className="h-6 w-6 text-orange-500" />
            Trial Reels
          </h1>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
            Every reel you post, ranked by followers gained per 10,000 views — the
            metric that tells you which hook is actually worth scaling.
          </p>
          <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
            {ranked.length} trials · ranked on followers per view, same score you'd use
            to pick winners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-[var(--hq-card-border)] bg-white p-0.5 text-sm">
            <button
              onClick={() => setRange("month")}
              className={`rounded-full px-3 py-1 ${
                range === "month" ? "bg-[var(--hq-text)] text-white" : "text-[var(--hq-text-muted)]"
              }`}
            >
              This month
            </button>
            <button
              onClick={() => setRange("last")}
              className={`rounded-full px-3 py-1 ${
                range === "last" ? "bg-[var(--hq-text)] text-white" : "text-[var(--hq-text-muted)]"
              }`}
            >
              Last month
            </button>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
          >
            {showForm ? "Close" : "Add reel"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5 sm:grid-cols-4"
        >
          <select
            className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube Shorts</option>
            <option value="other">Other</option>
          </select>
          <input
            required
            placeholder="Title / hook"
            className="col-span-2 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-1"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="URL (optional)"
            className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <input
            type="number"
            placeholder="Views"
            className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.views}
            onChange={(e) => setForm({ ...form, views: e.target.value })}
          />
          <input
            type="number"
            placeholder="Followers gained"
            className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.followersGained}
            onChange={(e) => setForm({ ...form, followersGained: e.target.value })}
          />
          <input
            type="date"
            className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={form.postedAt}
            onChange={(e) => setForm({ ...form, postedAt: e.target.value })}
          />
          <input
            placeholder="Notes (optional)"
            className="col-span-2 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm sm:col-span-3"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button
            disabled={submitting}
            className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Save"}
          </button>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-[var(--hq-text-muted)]">Loading…</p>}
        {!loading && ranked.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            No reels logged for this period yet.
          </p>
        )}
        {ranked.map((reel) => (
          <div
            key={reel.id}
            className="overflow-hidden rounded-xl border border-[var(--hq-card-border)] bg-white"
          >
            <div
              className={`relative flex aspect-video items-center justify-center bg-gradient-to-br ${
                PLATFORM_GRADIENT[reel.platform] || PLATFORM_GRADIENT.other
              }`}
            >
              <span className="text-sm font-medium text-white/90 capitalize">{reel.platform}</span>
              <button
                onClick={() => handleDelete(reel.id)}
                className="absolute right-2 top-2 rounded-md bg-black/30 p-1 text-white/80 hover:bg-black/50"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="rounded bg-[var(--hq-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--hq-accent)]">
                  Trial reel
                </span>
                <button
                  onClick={() => handleCopy(reel)}
                  className="flex items-center gap-1 text-[11px] text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
                >
                  <Copy className="h-3 w-3" />
                  {copiedId === reel.id ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--hq-text)]">{reel.title}</p>
              <div className="mt-2 flex items-baseline justify-between text-xs text-[var(--hq-text-muted)]">
                <span>
                  <span className="font-semibold text-[var(--hq-text)]">
                    {scorePer10k(reel).toFixed(1)}
                  </span>{" "}
                  score / 10k views
                </span>
                <span>{reel.views.toLocaleString()} views</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[var(--hq-text-muted)]">
                <span>{reel.followersGained} followers</span>
                <span>{new Date(reel.postedAt).toLocaleDateString()}</span>
              </div>
              {reel.url && (
                <a
                  href={reel.url}
                  target="_blank"
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--hq-accent)] hover:underline"
                >
                  View reel <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
