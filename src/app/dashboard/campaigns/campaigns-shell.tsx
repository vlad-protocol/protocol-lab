"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Send, Users, AlertTriangle, Mail, MessageSquare, Search, Eye, MousePointerClick, ChevronRight } from "lucide-react";
import { TYPE_OPTIONS, STATUS_OPTIONS } from "../protocol-crm/types";
import type { EmailBlock, EmailSettings } from "@/lib/email-blocks";
import { BlockEditor } from "./block-editor";

type ListMember = { id: string; name: string | null; email: string | null; phone: string | null };

type SendCounts = Record<string, number>;

type Campaign = {
  id: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELED";
  audienceFilter: { source?: "crm" | "list"; types?: string[]; statuses?: string[]; listMemberIds?: string[] } | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  sendCounts: SendCounts;
  subject?: string; // email only
  body: string;
  blocks?: EmailBlock[] | null; // email only
  settings?: EmailSettings | null; // email only
  openedCount?: number; // email only
  clickedCount?: number; // email only
};

type Channel = "email" | "sms";

const STATUS_BADGE: Record<Campaign["status"], string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  SENDING: "bg-amber-50 text-amber-700",
  SENT: "bg-emerald-50 text-emerald-700",
  CANCELED: "bg-red-50 text-red-700",
};

export function CampaignsShell({
  initialEmailCampaigns,
  initialSmsCampaigns,
  sesReady,
  twilioReady,
}: {
  initialEmailCampaigns: Campaign[];
  initialSmsCampaigns: Campaign[];
  sesReady: boolean;
  twilioReady: boolean;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("email");
  const [emailCampaigns, setEmailCampaigns] = useState(initialEmailCampaigns);
  const [smsCampaigns, setSmsCampaigns] = useState(initialSmsCampaigns);
  const [showNew, setShowNew] = useState(false);

  const campaigns = channel === "email" ? emailCampaigns : smsCampaigns;
  const setCampaigns = channel === "email" ? setEmailCampaigns : setSmsCampaigns;
  const ready = channel === "email" ? sesReady : twilioReady;

  async function sendNow(id: string) {
    if (!confirm("Queue this campaign for sending? Drafts can't be edited after this.")) return;
    const res = await fetch(`/api/campaigns/${channel}/${id}/send`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "Failed to queue campaign.");
      return;
    }
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: c.scheduledAt ? "SCHEDULED" : "SENDING" } : c)));
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this draft campaign?")) return;
    await fetch(`/api/campaigns/${channel}/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-[var(--hq-card-border)] bg-white p-0.5">
          <button
            onClick={() => setChannel("email")}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
              channel === "email" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          <button
            onClick={() => setChannel("sms")}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
              channel === "sms" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> SMS
          </button>
        </div>
        <button
          onClick={() => setShowNew((s) => !s)}
          className="flex items-center gap-1 rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-3.5 w-3.5" /> {showNew ? "Close" : `New ${channel === "email" ? "email" : "SMS"} campaign`}
        </button>
      </div>

      {!ready && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {channel === "email"
            ? "Amazon SES isn't configured yet — you can draft campaigns, but sending needs AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_EMAIL set in Railway. See the README."
            : "Twilio isn't connected yet — you can draft campaigns, but sending needs it connected in Settings."}
        </p>
      )}

      {showNew && (
        <Composer
          channel={channel}
          onCreated={(campaign) => {
            setCampaigns((prev) => [{ ...campaign, sendCounts: {} }, ...prev]);
            setShowNew(false);
            router.refresh();
          }}
        />
      )}

      <div className="mt-6 space-y-3">
        {campaigns.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">No {channel === "email" ? "email" : "SMS"} campaigns yet.</p>
        )}
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} channel={channel} onSend={sendNow} onDelete={remove} />
        ))}
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  channel,
  onSend,
  onDelete,
}: {
  campaign: Campaign;
  channel: Channel;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const counts = campaign.sendCounts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const filterSummary = describeFilter(campaign.audienceFilter);
  const hasActivity = campaign.status !== "DRAFT";

  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={hasActivity ? `/dashboard/campaigns/${channel}/${campaign.id}` : "#"}
          className={hasActivity ? "flex-1 cursor-pointer" : "flex-1"}
          onClick={(e) => {
            if (!hasActivity) e.preventDefault();
          }}
        >
          <p className="flex items-center gap-2 font-medium text-[var(--hq-text)]">
            {channel === "email" ? <Mail className="h-3.5 w-3.5 text-[var(--hq-accent)]" /> : <MessageSquare className="h-3.5 w-3.5 text-[var(--hq-accent)]" />}
            {campaign.name}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${STATUS_BADGE[campaign.status]}`}>
              {campaign.status}
            </span>
            {hasActivity && <ChevronRight className="h-3.5 w-3.5 text-[var(--hq-text-muted)]" />}
          </p>
          {campaign.subject && <p className="mt-1 text-xs text-[var(--hq-text-muted)]">Subject: {campaign.subject}</p>}
          <p className="mt-1 text-xs text-[var(--hq-text-muted)]">Audience: {filterSummary}</p>
          {campaign.scheduledAt && (
            <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
              Scheduled for {new Date(campaign.scheduledAt).toLocaleString()}
            </p>
          )}
          {total > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
              <Users className="h-3 w-3" />
              {["SENT", "PENDING", "FAILED", "BOUNCED", "COMPLAINED"]
                .filter((s) => counts[s])
                .map((s) => `${counts[s]} ${s.toLowerCase()}`)
                .join(" · ")}
              {channel === "email" && (campaign.openedCount || campaign.clickedCount) ? (
                <>
                  <span className="mx-1 text-[var(--hq-card-border)]">|</span>
                  {campaign.openedCount ? (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {campaign.openedCount} opened
                    </span>
                  ) : null}
                  {campaign.clickedCount ? (
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3" /> {campaign.clickedCount} clicked
                    </span>
                  ) : null}
                </>
              ) : null}
            </p>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {campaign.status === "DRAFT" && (
            <>
              <button
                onClick={() => onSend(campaign.id)}
                className="flex items-center gap-1 rounded-md bg-[var(--hq-text)] px-3 py-1.5 text-xs font-medium text-white"
              >
                <Send className="h-3 w-3" /> {campaign.scheduledAt ? "Schedule" : "Send now"}
              </button>
              <button onClick={() => onDelete(campaign.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function describeFilter(filter: Campaign["audienceFilter"]) {
  if (filter?.source === "list") {
    if (filter.listMemberIds && filter.listMemberIds.length > 0) {
      return `Protocol List — ${filter.listMemberIds.length} selected`;
    }
    return "Protocol List — everyone on it";
  }
  if (!filter || ((!filter.types || filter.types.length === 0) && (!filter.statuses || filter.statuses.length === 0))) {
    return "Everyone in the CRM with an address on file";
  }
  const parts: string[] = [];
  if (filter.types && filter.types.length > 0) parts.push(filter.types.join(", "));
  if (filter.statuses && filter.statuses.length > 0) parts.push(filter.statuses.join(", "));
  return parts.join(" · ");
}

function Composer({ channel, onCreated }: { channel: Channel; onCreated: (campaign: Campaign) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyMode, setBodyMode] = useState<"plain" | "visual">("plain");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [settings, setSettings] = useState<EmailSettings>({ backgroundColor: "#f4f4f5", containerColor: "#ffffff", maxWidth: 600 });
  const [source, setSource] = useState<"crm" | "list">("crm");
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [listMembers, setListMembers] = useState<ListMember[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [preview, setPreview] = useState<{ count: number; suppressedCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    setPreview(null);
  }

  function setSourceAndReset(next: "crm" | "list") {
    setSource(next);
    setPreview(null);
    if (next === "list" && listMembers === null && !listLoading) {
      setListLoading(true);
      fetch("/api/protocol-list")
        .then((r) => r.json())
        .then((d) => setListMembers(d.members || []))
        .finally(() => setListLoading(false));
    }
  }

  function buildFilter() {
    return source === "list"
      ? { source: "list" as const, ...(selectedMemberIds.length > 0 ? { listMemberIds: selectedMemberIds } : {}) }
      : { source: "crm" as const, types, statuses };
  }

  async function checkAudience() {
    const filter = buildFilter();
    const res = await fetch("/api/campaigns/audience-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, filter }),
    });
    const d = await res.json().catch(() => null);
    if (d) setPreview(d);
  }

  const useVisual = channel === "email" && bodyMode === "visual";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (useVisual && blocks.length === 0) {
      setError("Add at least one block, or switch to Plain text.");
      return;
    }
    setBusy(true);
    setError(null);
    const audienceFilter = buildFilter();
    const res = await fetch(`/api/campaigns/${channel}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ...(channel === "email" ? { subject } : {}),
        body,
        ...(useVisual ? { blocks, settings } : {}),
        audienceFilter,
        scheduledAt: scheduledAt || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Failed to create campaign.");
      return;
    }
    onCreated(d.campaign);
  }

  return (
    <form onSubmit={create} className="mt-4 space-y-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        required
        placeholder="Campaign name (internal — e.g. September Sponsor Push)"
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {channel === "email" && (
        <input
          required
          placeholder="Subject line — supports {{contactName}}, {{companyName}}"
          className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      )}
      {channel === "email" && (
        <div className="flex rounded-lg border border-[var(--hq-card-border)] bg-neutral-50 p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setBodyMode("plain")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              bodyMode === "plain" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            Plain text
          </button>
          <button
            type="button"
            onClick={() => setBodyMode("visual")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              bodyMode === "visual" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            Visual builder — images, colors, buttons
          </button>
        </div>
      )}

      {useVisual ? (
        <BlockEditor blocks={blocks} settings={settings} onChange={(b, s) => { setBlocks(b); setSettings(s); }} />
      ) : (
        <textarea
          required
          placeholder={
            channel === "email"
              ? "Email body (HTML or plain text) — supports {{contactName}}, {{companyName}}. An unsubscribe link is added automatically."
              : "Text message — supports {{contactName}}, {{companyName}}. \"Reply STOP to unsubscribe\" is added automatically."
          }
          rows={6}
          className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      )}

      <div>
        <p className="text-xs font-semibold text-[var(--hq-text)]">Audience</p>
        <div className="mt-1.5 flex rounded-lg border border-[var(--hq-card-border)] bg-neutral-50 p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setSourceAndReset("crm")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              source === "crm" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            Protocol CRM
          </button>
          <button
            type="button"
            onClick={() => setSourceAndReset("list")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              source === "list" ? "bg-[var(--hq-accent)] text-white" : "text-[var(--hq-text-muted)]"
            }`}
          >
            Protocol List
          </button>
        </div>

        {source === "crm" ? (
          <>
            <p className="mt-2 text-xs text-[var(--hq-text-muted)]">Leave blank for everyone in the CRM</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => toggle(types, setTypes, t.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    types.includes(t.value) ? "bg-[var(--hq-accent)] text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => toggle(statuses, setStatuses, s.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    statuses.includes(s.value) ? "bg-[var(--hq-accent)] text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <ListMemberPicker
            channel={channel}
            members={listMembers}
            loading={listLoading}
            search={listSearch}
            onSearchChange={setListSearch}
            selectedIds={selectedMemberIds}
            onSelectedIdsChange={(ids) => {
              setSelectedMemberIds(ids);
              setPreview(null);
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={checkAudience}
          className="flex items-center gap-1 rounded-md border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)]"
        >
          <Users className="h-3 w-3" /> Check audience size
        </button>
        {preview && (
          <p className="text-xs text-[var(--hq-text-muted)]">
            {preview.count} would receive this{" "}
            {preview.suppressedCount > 0 && `(${preview.suppressedCount} suppressed/unsubscribed excluded)`}
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--hq-text)]">Schedule for later (optional)</label>
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      <button disabled={busy} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        Save as draft
      </button>
    </form>
  );
}

function ListMemberPicker({
  channel,
  members,
  loading,
  search,
  onSearchChange,
  selectedIds,
  onSelectedIdsChange,
}: {
  channel: Channel;
  members: ListMember[] | null;
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  // Only people reachable on this channel can actually receive the
  // campaign — filter out members with no email (for an email campaign)
  // or no phone (for SMS) so the picker doesn't offer someone you can't
  // actually message this way.
  const eligible = useMemo(
    () => (members || []).filter((m) => (channel === "email" ? !!m.email : !!m.phone)),
    [members, channel]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((m) => `${m.name || ""} ${m.email || ""} ${m.phone || ""}`.toLowerCase().includes(q));
  }, [eligible, search]);

  const selectedSet = new Set(selectedIds);

  function toggleOne(id: string) {
    onSelectedIdsChange(selectedSet.has(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id]);
  }

  function selectAllFiltered() {
    const ids = new Set(selectedIds);
    for (const m of filtered) ids.add(m.id);
    onSelectedIdsChange([...ids]);
  }

  function clearFiltered() {
    const filteredIds = new Set(filtered.map((m) => m.id));
    onSelectedIdsChange(selectedIds.filter((id) => !filteredIds.has(id)));
  }

  if (loading) {
    return <p className="mt-2 text-xs text-[var(--hq-text-muted)]">Loading Protocol List…</p>;
  }
  if (!members) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-[var(--hq-text-muted)]">
        Leave everyone unchecked to send to the whole list ({eligible.length} reachable by{" "}
        {channel === "email" ? "email" : "SMS"}), or check specific people to send to only them.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-md border border-[var(--hq-card-border)] py-1.5 pl-8 pr-3 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={selectAllFiltered}
          className="rounded-md border border-[var(--hq-card-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--hq-text)]"
        >
          Select all{search.trim() ? " matching" : ""}
        </button>
        <button
          type="button"
          onClick={clearFiltered}
          className="rounded-md border border-[var(--hq-card-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--hq-text)]"
        >
          Clear{search.trim() ? " matching" : ""}
        </button>
        {selectedIds.length > 0 && (
          <span className="rounded-full bg-[var(--hq-accent)]/10 px-2 py-1 text-xs font-medium text-[var(--hq-accent)]">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-[var(--hq-card-border)]">
        {filtered.length === 0 && (
          <p className="p-3 text-xs text-[var(--hq-text-muted)]">
            {eligible.length === 0 ? `No one on the list has an ${channel === "email" ? "email" : "phone number"} yet.` : "No matches."}
          </p>
        )}
        {filtered.map((m) => (
          <label
            key={m.id}
            className="flex items-center gap-2 border-b border-[var(--hq-card-border)] px-3 py-1.5 text-xs last:border-0 hover:bg-neutral-50"
          >
            <input type="checkbox" checked={selectedSet.has(m.id)} onChange={() => toggleOne(m.id)} />
            <span className="font-medium text-[var(--hq-text)]">{m.name || "—"}</span>
            <span className="text-[var(--hq-text-muted)]">{channel === "email" ? m.email : m.phone}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
