"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Mail, Sparkles } from "lucide-react";

type Step = {
  id?: string;
  delayDays: number;
  subject: string;
  body: string;
  researchAngle?: string | null;
  subjectFr?: string | null;
  bodyFr?: string | null;
};
type Sequence = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  requiresConfirmation: boolean;
  activeCount: number;
  createdBy: { id: string; name: string | null; email: string } | null;
  steps: Step[];
};

const EMPTY_STEP: Step = { delayDays: 0, subject: "", body: "", researchAngle: "", subjectFr: "", bodyFr: "" };

export function SequencesClient({
  initialSequences,
  hasOldDefaultSequence,
}: {
  initialSequences: Sequence[];
  hasOldDefaultSequence: boolean;
}) {
  const router = useRouter();
  const [sequences, setSequences] = useState(initialSequences);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSteps, setNewSteps] = useState<Step[]>([{ ...EMPTY_STEP }]);
  const [newRequiresConfirmation, setNewRequiresConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(hasOldDefaultSequence);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<string | null>(null);

  // One-time upgrade for accounts whose default sequence was seeded under
  // the old name before the Sponsor Cold Outreach templates existed — see
  // /api/admin/migrate-sponsor-sequence and hasOldDefaultSequence above.
  async function upgradeDefaultSequence() {
    setUpgrading(true);
    setUpgradeResult(null);
    const res = await fetch("/api/admin/migrate-sponsor-sequence", { method: "POST" });
    const d = await res.json().catch(() => null);
    setUpgrading(false);
    if (!res.ok || !d) {
      setUpgradeResult("Failed to upgrade the sequence.");
      return;
    }
    if (d.migrated) {
      setShowUpgrade(false);
      router.refresh();
    } else {
      setUpgradeResult(d.reason || "Nothing to upgrade.");
    }
  }

  async function createSequence(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDescription || undefined,
        requiresConfirmation: newRequiresConfirmation,
        steps: newSteps,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Failed to create sequence.");
      return;
    }
    setShowNew(false);
    setNewName("");
    setNewDescription("");
    setNewSteps([{ ...EMPTY_STEP }]);
    setNewRequiresConfirmation(false);
    setSequences((s) => [
      ...s,
      { ...d.sequence, activeCount: 0, createdBy: null, steps: d.sequence.steps },
    ]);
    router.refresh();
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    setSequences((s) => s.map((x) => (x.id === id ? { ...x, enabled } : x)));
    await fetch(`/api/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  async function toggleRequiresConfirmation(id: string, requiresConfirmation: boolean) {
    setSequences((s) => s.map((x) => (x.id === id ? { ...x, requiresConfirmation } : x)));
    await fetch(`/api/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requiresConfirmation }),
    });
  }

  async function saveSteps(id: string, steps: Step[]) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Failed to save steps.");
      return;
    }
    setSequences((s) => s.map((x) => (x.id === id ? { ...x, steps: d.sequence.steps } : x)));
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/sequences/${id}`, { method: "DELETE" });
    setSequences((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {showUpgrade && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--hq-accent)]/30 bg-[var(--hq-accent)]/5 p-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--hq-accent)]" /> Newer sponsorship outreach templates available
            </p>
            <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
              Your "Sponsor Cold Outreach" sequence is missing the latest templates (including the
              French versions) — click to sync its steps in place to what's currently saved here.
              This overwrites that sequence's current subject/body with the latest templates, so
              save any manual edits elsewhere first if you want to keep them.
            </p>
            {upgradeResult && <p className="mt-1 text-xs text-[var(--hq-text-muted)]">{upgradeResult}</p>}
          </div>
          <button
            onClick={upgradeDefaultSequence}
            disabled={upgrading}
            className="shrink-0 rounded-md bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {upgrading ? "Syncing…" : "Sync now"}
          </button>
        </div>
      )}

      <button
        onClick={() => setShowNew((s) => !s)}
        className="flex items-center gap-1 rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
      >
        <Plus className="h-3.5 w-3.5" /> {showNew ? "Close" : "New sequence"}
      </button>

      {showNew && (
        <form onSubmit={createSequence} className="mt-4 space-y-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
          <input
            required
            placeholder="Name (e.g. New Lead Follow-Up)"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            placeholder="Description (optional)"
            className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <label className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
            <input
              type="checkbox"
              checked={newRequiresConfirmation}
              onChange={(e) => setNewRequiresConfirmation(e.target.checked)}
            />
            Require confirmation before sending (drafts wait in Automation Confirmations)
          </label>
          <StepEditor steps={newSteps} onChange={setNewSteps} />
          <button disabled={busy} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Create sequence
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {sequences.length === 0 && <p className="text-sm text-[var(--hq-text-muted)]">No sequences yet.</p>}
        {sequences.map((seq) => (
          <div key={seq.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpanded((e) => (e === seq.id ? null : seq.id))}
                className="flex items-center gap-2 text-left"
              >
                {expanded === seq.id ? (
                  <ChevronUp className="h-4 w-4 text-[var(--hq-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--hq-text-muted)]" />
                )}
                <div>
                  <p className="flex items-center gap-1.5 font-medium text-[var(--hq-text)]">
                    <Mail className="h-3.5 w-3.5 text-[var(--hq-accent)]" /> {seq.name}
                  </p>
                  <p className="text-xs text-[var(--hq-text-muted)]">
                    {seq.steps.length} step{seq.steps.length === 1 ? "" : "s"} · {seq.activeCount} active
                    lead{seq.activeCount === 1 ? "" : "s"}
                    {seq.createdBy && ` · owned by ${seq.createdBy.name || seq.createdBy.email}`}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
                  <input
                    type="checkbox"
                    checked={seq.requiresConfirmation}
                    onChange={(e) => toggleRequiresConfirmation(seq.id, e.target.checked)}
                  />
                  Require confirmation
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[var(--hq-text-muted)]">
                  <input type="checkbox" checked={seq.enabled} onChange={(e) => toggleEnabled(seq.id, e.target.checked)} />
                  Enabled
                </label>
                <button onClick={() => remove(seq.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {seq.description && <p className="mt-2 text-xs text-[var(--hq-text-muted)]">{seq.description}</p>}
            {seq.requiresConfirmation && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--hq-accent)]">
                <Sparkles className="h-3 w-3" /> Drafts wait for confirmation on the Automation Confirmations page
                instead of sending automatically.
              </p>
            )}

            {expanded === seq.id && (
              <div className="mt-4 border-t border-[var(--hq-card-border)] pt-4">
                <StepEditor
                  steps={seq.steps}
                  onChange={(steps) => setSequences((s) => s.map((x) => (x.id === seq.id ? { ...x, steps } : x)))}
                />
                <button
                  onClick={() => saveSteps(seq.id, seq.steps)}
                  disabled={busy}
                  className="mt-3 rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Save steps
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepEditor({ steps, onChange }: { steps: Step[]; onChange: (steps: Step[]) => void }) {
  const [showFr, setShowFr] = useState<Record<number, boolean>>({});

  function update(i: number, patch: Partial<Step>) {
    onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    onChange([...steps, { ...EMPTY_STEP }]);
  }
  function remove(i: number) {
    onChange(steps.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.id || i} className="rounded-lg border border-[var(--hq-card-border)] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--hq-text)]">
              Email {i + 1} {i === 0 ? "— sent right away" : `— sent ${step.delayDays} day${step.delayDays === 1 ? "" : "s"} after email ${i}`}
            </p>
            {steps.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input
              placeholder="Subject"
              className="w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
              value={step.subject}
              onChange={(e) => update(i, { subject: e.target.value })}
            />
            {i > 0 && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  className="w-16 rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
                  value={step.delayDays}
                  onChange={(e) => update(i, { delayDays: Math.max(0, Number(e.target.value) || 0) })}
                />
                <span className="text-xs text-[var(--hq-text-muted)]">days later</span>
              </div>
            )}
          </div>
          <textarea
            placeholder="Body — use {{contactName}}, {{firstName}}, {{companyName}}, {{brand}}, {{repName}}, {{bookingLink}}, {{observation}}, {{hook}}"
            rows={3}
            className="mt-2 w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            value={step.body}
            onChange={(e) => update(i, { body: e.target.value })}
          />
          <textarea
            placeholder="AI research angle (optional) — what to research and fill into {{observation}}/{{hook}} for this step. Leave blank if this step needs no personalization research."
            rows={2}
            className="mt-2 w-full rounded-md border border-dashed border-[var(--hq-card-border)] px-2 py-1.5 text-xs text-[var(--hq-text-muted)]"
            value={step.researchAngle || ""}
            onChange={(e) => update(i, { researchAngle: e.target.value })}
          />

          <button
            type="button"
            onClick={() => setShowFr((s) => ({ ...s, [i]: !s[i] }))}
            className="mt-2 text-xs font-medium text-[var(--hq-accent)] hover:underline"
          >
            {showFr[i] ? "Hide" : step.subjectFr || step.bodyFr ? "Edit" : "Add"} French version
          </button>

          {showFr[i] && (
            <div className="mt-2 space-y-2 rounded-md border border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-2">
              <input
                placeholder="Sujet (français) — laisser vide pour utiliser la version anglaise"
                className="w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
                value={step.subjectFr || ""}
                onChange={(e) => update(i, { subjectFr: e.target.value })}
              />
              <textarea
                placeholder="Corps du courriel (français) — laisser vide pour utiliser la version anglaise. Mêmes jetons : {{contactName}}, {{firstName}}, {{companyName}}, {{brand}}, {{repName}}, {{bookingLink}}, {{observation}}, {{hook}}"
                rows={3}
                className="w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
                value={step.bodyFr || ""}
                onChange={(e) => update(i, { bodyFr: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 rounded-md border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)]"
      >
        <Plus className="h-3 w-3" /> Add another email
      </button>
    </div>
  );
}
