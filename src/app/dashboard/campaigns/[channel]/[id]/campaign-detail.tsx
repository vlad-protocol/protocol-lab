"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Mail, MessageSquare, Eye, MousePointerClick, CheckCircle2, XCircle, Clock } from "lucide-react";

type EmailSend = {
  id: string;
  toEmail: string;
  toName: string | null;
  status: "PENDING" | "SENT" | "FAILED" | "BOUNCED" | "COMPLAINED";
  error: string | null;
  sentAt: string | null;
  openedAt: string | null;
  clickCount: number;
  lastClickedAt: string | null;
};

type SmsSend = {
  id: string;
  toPhone: string;
  toName: string | null;
  status: "PENDING" | "SENT" | "FAILED" | "BOUNCED" | "COMPLAINED";
  error: string | null;
  sentAt: string | null;
};

type Campaign = {
  id: string;
  name: string;
  subject?: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELED";
  createdAt: string;
  sentAt: string | null;
  sends: (EmailSend | SmsSend)[];
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  SENDING: "bg-amber-50 text-amber-700",
  SENT: "bg-emerald-50 text-emerald-700",
  CANCELED: "bg-red-50 text-red-700",
};

const SEND_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-neutral-100 text-neutral-600",
  SENT: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  BOUNCED: "bg-orange-50 text-orange-700",
  COMPLAINED: "bg-red-50 text-red-700",
};

export function CampaignDetail({ channel, campaign }: { channel: "email" | "sms"; campaign: Campaign }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState<"all" | "opened" | "clicked" | "unopened">("all");

  const sends = campaign.sends;
  const isEmail = channel === "email";

  const stats = useMemo(() => {
    const total = sends.length;
    const sent = sends.filter((s) => s.status === "SENT").length;
    const failed = sends.filter((s) => s.status === "FAILED").length;
    const bounced = sends.filter((s) => s.status === "BOUNCED").length;
    const pending = sends.filter((s) => s.status === "PENDING").length;
    const opened = isEmail ? (sends as EmailSend[]).filter((s) => !!s.openedAt).length : 0;
    const clicked = isEmail ? (sends as EmailSend[]).filter((s) => s.clickCount > 0).length : 0;
    return { total, sent, failed, bounced, pending, opened, clicked };
  }, [sends, isEmail]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return sends.filter((s) => {
      const addr = isEmail ? (s as EmailSend).toEmail : (s as SmsSend).toPhone;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (isEmail) {
        const es = s as EmailSend;
        if (engagementFilter === "opened" && !es.openedAt) return false;
        if (engagementFilter === "clicked" && !(es.clickCount > 0)) return false;
        if (engagementFilter === "unopened" && es.openedAt) return false;
      }
      if (query && !`${s.toName || ""} ${addr}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [sends, q, statusFilter, engagementFilter, isEmail]);

  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);

  return (
    <div>
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to campaigns
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--hq-text)]">
            {isEmail ? <Mail className="h-5 w-5 text-[var(--hq-accent)]" /> : <MessageSquare className="h-5 w-5 text-[var(--hq-accent)]" />}
            {campaign.name}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${STATUS_BADGE[campaign.status]}`}>
              {campaign.status}
            </span>
          </h1>
          {campaign.subject && <p className="mt-1 text-sm text-[var(--hq-text-muted)]">Subject: {campaign.subject}</p>}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
        <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Total" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />} label="Sent" value={stats.sent} sub={`${pct(stats.sent)}%`} />
        {isEmail && (
          <StatCard icon={<Eye className="h-3.5 w-3.5 text-blue-600" />} label="Opened" value={stats.opened} sub={`${pct(stats.opened)}%`} />
        )}
        {isEmail && (
          <StatCard
            icon={<MousePointerClick className="h-3.5 w-3.5 text-violet-600" />}
            label="Clicked"
            value={stats.clicked}
            sub={`${pct(stats.clicked)}%`}
          />
        )}
        <StatCard icon={<XCircle className="h-3.5 w-3.5 text-red-600" />} label="Failed" value={stats.failed} />
        <StatCard icon={<Clock className="h-3.5 w-3.5 text-amber-600" />} label="Pending" value={stats.pending} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isEmail ? "Search name or email…" : "Search name or phone…"}
            className="w-full rounded-md border border-[var(--hq-card-border)] py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="BOUNCED">Bounced</option>
          <option value="COMPLAINED">Complained</option>
        </select>
        {isEmail && (
          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value as never)}
            className="rounded-md border border-[var(--hq-card-border)] px-2.5 py-1.5 text-sm"
          >
            <option value="all">Any engagement</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked a link</option>
            <option value="unopened">Not opened yet</option>
          </select>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
            <tr>
              <th className="px-3 py-2">Recipient</th>
              <th className="px-3 py-2">{isEmail ? "Email" : "Phone"}</th>
              <th className="px-3 py-2">Status</th>
              {isEmail && <th className="px-3 py-2">Opened</th>}
              {isEmail && <th className="px-3 py-2">Clicks</th>}
              <th className="px-3 py-2">Sent</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const es = isEmail ? (s as EmailSend) : null;
              return (
                <tr key={s.id} className="border-b border-[var(--hq-card-border)] last:border-0">
                  <td className="px-3 py-2 text-[var(--hq-text)]">{s.toName || "—"}</td>
                  <td className="px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                    {isEmail ? (s as EmailSend).toEmail : (s as SmsSend).toPhone}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${SEND_STATUS_BADGE[s.status]}`}>
                      {s.status}
                    </span>
                    {s.error && <p className="mt-0.5 max-w-[220px] truncate text-[10px] text-red-600" title={s.error}>{s.error}</p>}
                  </td>
                  {isEmail && (
                    <td className="px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                      {es?.openedAt ? new Date(es.openedAt).toLocaleString() : "—"}
                    </td>
                  )}
                  {isEmail && (
                    <td className="px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                      {es && es.clickCount > 0 ? `${es.clickCount}x` : "—"}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                    {s.sentAt ? new Date(s.sentAt).toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isEmail ? 6 : 4} className="px-3 py-6 text-center text-xs text-[var(--hq-text-muted)]">
                  No recipients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
        {icon} {label}
      </div>
      <p className="mt-1 text-xl font-semibold text-[var(--hq-text)]">
        {value}
        {sub && <span className="ml-1 text-xs font-normal text-[var(--hq-text-muted)]">({sub})</span>}
      </p>
    </div>
  );
}
