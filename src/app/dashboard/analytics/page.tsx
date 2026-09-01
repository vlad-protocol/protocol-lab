"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2, Instagram, Youtube, Mail as MailIcon, Hash } from "lucide-react";

type Stat = {
  id: string;
  platform: string;
  weekOf: string;
  followerCount: number;
};

type Reel = {
  id: string;
  views: number;
  followersGained: number;
  postedAt: string;
};

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

const PLATFORM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  newsletter: MailIcon,
  tiktok: Hash,
  other: Hash,
};

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) {
    return <div className="h-8 w-full" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    platform: "instagram",
    weekOf: mondayOf(new Date()),
    followerCount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const [statsRes, reelsRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/reels"),
    ]);
    setStats((await statsRes.json()).stats || []);
    setReels((await reelsRes.json()).reels || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, followerCount: Number(form.followerCount) || 0 }),
    });
    setForm((f) => ({ ...f, followerCount: "" }));
    setSubmitting(false);
    setShowForm(false);
    load();
  }

  const channels = useMemo(() => {
    const platforms = Array.from(new Set(stats.map((s) => s.platform)));
    return platforms.map((platform) => {
      const rows = stats
        .filter((s) => s.platform === platform)
        .sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime());
      const latest = rows[rows.length - 1]?.followerCount ?? 0;
      const prev = rows.length > 1 ? rows[rows.length - 2].followerCount : latest;
      const delta = latest - prev;
      return {
        platform,
        latest,
        delta,
        points: rows.slice(-8).map((r) => r.followerCount),
      };
    });
  }, [stats]);

  const totalGained = channels.reduce((sum, c) => sum + Math.max(c.delta, 0), 0);
  const totalFollowers = channels.reduce((sum, c) => sum + c.latest, 0);
  const maxFollowers = Math.max(...channels.map((c) => c.latest), 1);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thisWeekReels = reels.filter((r) => new Date(r.postedAt) >= weekAgo);
  const lastWeekReels = reels.filter(
    (r) => new Date(r.postedAt) >= twoWeeksAgo && new Date(r.postedAt) < weekAgo
  );
  const avgScore = (list: Reel[]) => {
    if (list.length === 0) return 0;
    const total = list.reduce(
      (sum, r) => sum + (r.views > 0 ? (r.followersGained / r.views) * 10000 : 0),
      0
    );
    return total / list.length;
  };
  const scoreThisWeek = avgScore(thisWeekReels);
  const scoreLastWeek = avgScore(lastWeekReels);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
            <BarChart2 className="h-6 w-6 text-[var(--hq-accent)]" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
            Every platform's follower count, tracked weekly, in one place.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Close" : "Log this week"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
              Platform
            </label>
            <select
              className="mt-1 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="newsletter">Newsletter</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
              Week of (Monday)
            </label>
            <input
              type="date"
              className="mt-1 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              value={form.weekOf}
              onChange={(e) => setForm({ ...form, weekOf: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--hq-text-muted)]">
              Follower count
            </label>
            <input
              type="number"
              className="mt-1 rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              value={form.followerCount}
              onChange={(e) => setForm({ ...form, followerCount: e.target.value })}
            />
          </div>
          <button
            disabled={submitting}
            className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
          All channels
        </p>
        <p className="text-xs text-[var(--hq-text-muted)]">
          <span className="font-semibold text-[var(--hq-positive)]">+{totalGained.toLocaleString()}</span>{" "}
          across {channels.length} tracked channel{channels.length === 1 ? "" : "s"} this week
        </p>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading && <p className="text-sm text-[var(--hq-text-muted)]">Loading…</p>}
        {!loading && channels.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            No data yet — log your first week above.
          </p>
        )}
        {channels.map((c) => {
          const PIcon = PLATFORM_ICON[c.platform] || Hash;
          return (
            <div
              key={c.platform}
              className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--hq-text)]">
                  <PIcon className="h-3.5 w-3.5" />
                  <span className="capitalize">{c.platform}</span>
                </span>
              </div>
              <p
                className={`mt-2 text-xl font-semibold ${
                  c.delta >= 0 ? "text-[var(--hq-text)]" : "text-[var(--hq-negative)]"
                }`}
              >
                {c.delta >= 0 ? "+" : ""}
                {c.delta.toLocaleString()}{" "}
                <span className="text-xs font-normal text-[var(--hq-text-muted)]">this week</span>
              </p>
              <Sparkline points={c.points} color={c.delta >= 0 ? "#dc2626" : "#71717a"} />
              <p className="text-xs text-[var(--hq-text-muted)]">
                now {c.latest.toLocaleString()} followers
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
        Growth pulse
      </p>
      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
            Followers gained
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--hq-text)]">
            +{totalGained.toLocaleString()}{" "}
            <span className="text-xs font-normal text-[var(--hq-text-muted)]">this week</span>
          </p>
          <div className="mt-3 space-y-2">
            {channels
              .slice()
              .sort((a, b) => b.delta - a.delta)
              .map((c) => (
                <div key={c.platform} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 truncate capitalize text-[var(--hq-text-muted)]">
                    {c.platform}
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--hq-canvas)]">
                    <div
                      className="h-1.5 rounded-full bg-[var(--hq-accent)]"
                      style={{
                        width: `${totalGained > 0 ? Math.max((c.delta / totalGained) * 100, 0) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium text-[var(--hq-text)]">
                    {c.delta >= 0 ? "+" : ""}
                    {c.delta}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
            This week vs last
          </p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
            {thisWeekReels.length}{" "}
            <span className="text-xs font-normal text-[var(--hq-text-muted)]">reels posted</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                thisWeekReels.length - lastWeekReels.length >= 0
                  ? "bg-emerald-50 text-[var(--hq-positive)]"
                  : "bg-red-50 text-[var(--hq-negative)]"
              }`}
            >
              {thisWeekReels.length - lastWeekReels.length >= 0 ? "+" : ""}
              {thisWeekReels.length - lastWeekReels.length} vs last
            </span>
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--hq-text-muted)]">
            <span>avg score / 10k views</span>
            <span
              className={`font-medium ${
                scoreThisWeek >= scoreLastWeek ? "text-[var(--hq-positive)]" : "text-[var(--hq-negative)]"
              }`}
            >
              {scoreThisWeek.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
            Top channel by followers
          </p>
          <div className="mt-3 space-y-2">
            {channels
              .slice()
              .sort((a, b) => b.latest - a.latest)
              .map((c) => (
                <div key={c.platform} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 truncate capitalize text-[var(--hq-text-muted)]">
                    {c.platform}
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--hq-canvas)]">
                    <div
                      className="h-1.5 rounded-full bg-[var(--hq-text)]"
                      style={{ width: `${(c.latest / maxFollowers) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-medium text-[var(--hq-text)]">
                    {c.latest.toLocaleString()}
                  </span>
                </div>
              ))}
            {channels.length === 0 && (
              <p className="text-xs text-[var(--hq-text-muted)]">No channels tracked yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
