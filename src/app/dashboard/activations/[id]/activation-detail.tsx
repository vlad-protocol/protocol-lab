"use client";

import { useState } from "react";
import { ACTIVATION_RULES, type ActivationRuleField } from "@/lib/activation-rules";
import { COST_SHEET_CATALOGUE, calcActivationTotals, type CostLineItem, type PackageTier } from "@/lib/activation-cost-sheet";

type Step = { id: string; stepNumber: number; title: string; owner: string; dueDate: string | null; doneWhen: string; done: boolean };
type Sponsor = { id: string; category: string; brandName: string | null; tier: string | null; fee: number | null; confirmed: boolean };
type Payment = { id: string; label: string; amount: number; dueDate: string | null; status: string };

type ActivationData = {
  id: string;
  eventName: string;
  eventDate: string | null;
  packageTier: PackageTier;
  clientMultiplier: number;
  mainSponsorCategory: string | null;
  costLineItems: unknown;
  quoteTotal: number;
  proposalDraft: string | null;
  contractDraft: string | null;
  reportDraft: string | null;
  gate1PassedAt: string | null;
  gate2PassedAt: string | null;
  contact: { companyName: string | null; contactName: string };
  steps: Step[];
  sponsors: Sponsor[];
  payments: Payment[];
  [key: string]: unknown;
};

type Tab = "timeline" | "rules" | "cost" | "sponsors" | "payments" | "docs";

export function ActivationDetail({ activation }: { activation: ActivationData }) {
  const [tab, setTab] = useState<Tab>("timeline");
  const [a, setA] = useState(activation);

  async function patchActivation(body: Record<string, unknown>) {
    const res = await fetch(`/api/activations/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) setA((prev) => ({ ...prev, ...data.activation }));
    else alert(data.error || "Failed to save.");
  }

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-[var(--hq-text)]">{a.eventName}</h1>
        <span className="text-sm text-[var(--hq-text-muted)]">{a.contact.companyName || a.contact.contactName}</span>
      </div>

      <div className="mt-4 flex gap-1 border-b border-[var(--hq-card-border)] text-sm">
        {([
          ["timeline", "Timeline"],
          ["rules", "Activation Rules"],
          ["cost", "Cost Sheet"],
          ["sponsors", "Sponsors"],
          ["payments", "Payments"],
          ["docs", "Documents"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 ${tab === key ? "border-b-2 border-[var(--hq-accent)] text-[var(--hq-text)] font-medium" : "text-[var(--hq-text-muted)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "timeline" && <TimelineTab activation={a} setActivation={setA} />}
        {tab === "rules" && <RulesTab activation={a} patchActivation={patchActivation} />}
        {tab === "cost" && <CostSheetTab activation={a} setActivation={setA} />}
        {tab === "sponsors" && <SponsorsTab activation={a} setActivation={setA} />}
        {tab === "payments" && <PaymentsTab activation={a} setActivation={setA} />}
        {tab === "docs" && <DocsTab activation={a} setActivation={setA} />}
      </div>
    </div>
  );
}

function TimelineTab({ activation, setActivation }: { activation: ActivationData; setActivation: (fn: (a: ActivationData) => ActivationData) => void }) {
  async function toggleDone(step: Step) {
    const res = await fetch(`/api/activations/${activation.id}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !step.done }),
    });
    const data = await res.json();
    if (res.ok) {
      setActivation((prev) => ({ ...prev, steps: prev.steps.map((s) => (s.id === step.id ? data.step : s)) }));
    }
  }

  async function setEventDate(value: string) {
    const res = await fetch(`/api/activations/${activation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventDate: value || null }),
    });
    const data = await res.json();
    if (res.ok) setActivation(() => data.activation);
  }

  return (
    <div>
      <label className="mb-4 flex items-center gap-2 text-sm text-[var(--hq-text-muted)]">
        Event date
        <input
          type="date"
          defaultValue={activation.eventDate ? activation.eventDate.slice(0, 10) : ""}
          onBlur={(e) => setEventDate(e.target.value)}
          className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-sm text-[var(--hq-text)]"
        />
        <span className="text-xs">(changing this recomputes every step's due date)</span>
      </label>
      <ol className="flex flex-col gap-2">
        {activation.steps.map((s) => (
          <li key={s.id} className="flex items-start gap-3 rounded border border-[var(--hq-card-border)] p-3">
            <input type="checkbox" checked={s.done} onChange={() => toggleDone(s)} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${s.done ? "text-[var(--hq-text-muted)] line-through" : "text-[var(--hq-text)]"}`}>
                  {s.stepNumber} · {s.title}
                </span>
                <span className="text-xs text-[var(--hq-text-muted)]">
                  {s.owner} {s.dueDate ? `· ${new Date(s.dueDate).toLocaleDateString()}` : ""}
                </span>
              </div>
              <div className="text-xs text-[var(--hq-text-muted)]">Done when: {s.doneWhen}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RulesTab({ activation, patchActivation }: { activation: ActivationData; patchActivation: (body: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-xs">
        <span className={activation.gate1PassedAt ? "text-[var(--hq-positive)]" : "text-[var(--hq-text-muted)]"}>
          Gate 1 (rules 1-4, before proposal): {activation.gate1PassedAt ? "Passed" : "Not yet"}
        </span>
        <span className={activation.gate2PassedAt ? "text-[var(--hq-positive)]" : "text-[var(--hq-text-muted)]"}>
          Gate 2 (rules 5-10, before run of show): {activation.gate2PassedAt ? "Passed" : "Not yet"}
        </span>
      </div>
      {ACTIVATION_RULES.map((rule) => (
        <div key={rule.field} className="rounded border border-[var(--hq-card-border)] p-3">
          <div className="text-sm font-medium text-[var(--hq-text)]">
            {rule.number} · {rule.label}
          </div>
          <div className="mb-2 text-xs text-[var(--hq-text-muted)]">Passes when: {rule.passesWhen}</div>
          <textarea
            defaultValue={(activation[rule.field as ActivationRuleField] as string) || ""}
            onBlur={(e) => patchActivation({ [rule.field]: e.target.value })}
            className="w-full rounded border border-[var(--hq-card-border)] p-2 text-sm"
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

function CostSheetTab({ activation, setActivation }: { activation: ActivationData; setActivation: (fn: (a: ActivationData) => ActivationData) => void }) {
  const initial = (Array.isArray(activation.costLineItems) && (activation.costLineItems as CostLineItem[]).length > 0
    ? (activation.costLineItems as CostLineItem[])
    : COST_SHEET_CATALOGUE) as CostLineItem[];
  const [items, setItems] = useState<CostLineItem[]>(initial);
  const [tier, setTier] = useState<PackageTier>(activation.packageTier);
  const [multiplier, setMultiplier] = useState(activation.clientMultiplier);
  const [saving, setSaving] = useState(false);

  const totals = calcActivationTotals(items, tier, multiplier);

  function updateItem(i: number, field: "qty" | "unitCost", value: number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/activations/${activation.id}/cost-sheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: items, packageTier: tier, clientMultiplier: multiplier }),
      });
      const data = await res.json();
      if (res.ok) setActivation(() => data.activation);
      else alert(data.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-[var(--hq-text-muted)]">
          Package
          <select value={tier} onChange={(e) => setTier(e.target.value as PackageTier)} className="ml-2 rounded border border-[var(--hq-card-border)] px-2 py-1">
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
          </select>
        </label>
        <label className="text-sm text-[var(--hq-text-muted)]">
          Client multiplier (5-10x)
          <input
            type="number"
            min={5}
            max={10}
            step={0.5}
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value))}
            className="ml-2 w-20 rounded border border-[var(--hq-card-border)] px-2 py-1"
          />
        </label>
        <button onClick={save} disabled={saving} className="rounded bg-[var(--hq-accent)] px-3 py-1 text-sm text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save & regenerate payments"}
        </button>
      </div>

      {groups.map((group) => (
        <div key={group} className="mb-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--hq-text-muted)]">{group}</div>
          <table className="w-full text-sm">
            <tbody>
              {items.map((item, i) =>
                item.group === group ? (
                  <tr key={i} className="border-b border-[var(--hq-card-border)]">
                    <td className="py-1">{item.label}{item.minTier ? ` (${item.minTier.toLowerCase()}+)` : ""}</td>
                    <td className="w-16 py-1">
                      <input type="number" value={item.qty} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} className="w-14 rounded border border-[var(--hq-card-border)] px-1" />
                    </td>
                    <td className="w-20 py-1">
                      <input type="number" value={item.unitCost} onChange={(e) => updateItem(i, "unitCost", Number(e.target.value))} className="w-16 rounded border border-[var(--hq-card-border)] px-1" />
                    </td>
                    <td className="w-20 py-1 text-right">${(item.qty * item.unitCost).toFixed(0)}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </div>
      ))}

      <div className="rounded border border-[var(--hq-accent)] bg-[var(--hq-accent-soft)] p-3 text-sm">
        <div>A · Multiplied base (incl. 10% contingency): ${totals.costBaseA.toFixed(2)}</div>
        <div>A × multiplier: ${(totals.costBaseA * multiplier).toFixed(2)}</div>
        <div>B · Pass-through: ${totals.costPassThroughB.toFixed(2)}</div>
        <div>Pre-tax: ${totals.quotePreTax.toFixed(2)}</div>
        <div>Tax (GST+QST): ${totals.quoteTax.toFixed(2)}</div>
        <div className="font-semibold">Total: ${totals.quoteTotal.toFixed(2)}</div>
      </div>
    </div>
  );
}

function SponsorsTab({ activation, setActivation }: { activation: ActivationData; setActivation: (fn: (a: ActivationData) => ActivationData) => void }) {
  const [category, setCategory] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tier, setTier] = useState("");
  const [fee, setFee] = useState("");

  async function addSponsor() {
    const res = await fetch(`/api/activations/${activation.id}/sponsors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, brandName, tier, fee: fee ? Number(fee) : undefined }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setActivation((prev) => ({ ...prev, sponsors: [...prev.sponsors, data.sponsor] }));
    setCategory("");
    setBrandName("");
    setTier("");
    setFee("");
  }

  async function toggleConfirmed(s: Sponsor) {
    const res = await fetch(`/api/activations/${activation.id}/sponsors/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: !s.confirmed }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setActivation((prev) => ({ ...prev, sponsors: prev.sponsors.map((x) => (x.id === s.id ? data.sponsor : x)) }));
  }

  return (
    <div>
      <div className="mb-3 text-xs text-[var(--hq-text-muted)]">
        Main brand&apos;s category (auto-exclusive): <strong>{activation.mainSponsorCategory || "not set"}</strong>. No alcohol sponsors, ever.
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-sm" />
        <input placeholder="Brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-sm" />
        <input placeholder="Tier" value={tier} onChange={(e) => setTier(e.target.value)} className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-sm" />
        <input placeholder="Fee" type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="w-20 rounded border border-[var(--hq-card-border)] px-2 py-1 text-sm" />
        <button onClick={addSponsor} className="rounded bg-[var(--hq-accent)] px-3 py-1 text-sm text-white">Add slot</button>
      </div>
      <div className="flex flex-col gap-2">
        {activation.sponsors.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded border border-[var(--hq-card-border)] p-2 text-sm">
            <span>{s.category} — {s.brandName || "unconfirmed"} {s.tier ? `(${s.tier})` : ""} {s.fee ? `$${s.fee}` : ""}</span>
            <button onClick={() => toggleConfirmed(s)} className={s.confirmed ? "text-[var(--hq-positive)]" : "text-[var(--hq-text-muted)]"}>
              {s.confirmed ? "Confirmed" : "Mark confirmed"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsTab({ activation, setActivation }: { activation: ActivationData; setActivation: (fn: (a: ActivationData) => ActivationData) => void }) {
  async function setStatus(p: Payment, status: string) {
    const res = await fetch(`/api/activations/${activation.id}/payments/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setActivation((prev) => ({ ...prev, payments: prev.payments.map((x) => (x.id === p.id ? data.payment : x)) }));
  }

  return (
    <div className="flex flex-col gap-2">
      {activation.payments.length === 0 && <div className="text-sm text-[var(--hq-text-muted)]">Save the cost sheet to generate the 20/40/40 schedule.</div>}
      {activation.payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded border border-[var(--hq-card-border)] p-3 text-sm">
          <div>
            <div className="font-medium text-[var(--hq-text)]">{p.label}</div>
            <div className="text-xs text-[var(--hq-text-muted)]">
              ${p.amount.toFixed(2)} {p.dueDate ? `· due ${new Date(p.dueDate).toLocaleDateString()}` : ""}
            </div>
          </div>
          <select value={p.status} onChange={(e) => setStatus(p, e.target.value)} className="rounded border border-[var(--hq-card-border)] px-2 py-1 text-xs">
            <option value="PLANNED">Planned</option>
            <option value="INVOICED">Invoiced</option>
            <option value="RECEIVED">Received (posts to CFO)</option>
          </select>
        </div>
      ))}
    </div>
  );
}

function DocsTab({ activation, setActivation }: { activation: ActivationData; setActivation: (fn: (a: ActivationData) => ActivationData) => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function generate(type: "proposal" | "contract" | "report") {
    setLoading(type);
    try {
      const res = await fetch(`/api/activations/${activation.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error);
      setActivation(() => data.activation);
    } finally {
      setLoading(null);
    }
  }

  const docs: { key: "proposal" | "contract" | "report"; label: string; field: "proposalDraft" | "contractDraft" | "reportDraft" }[] = [
    { key: "proposal", label: "Proposal (07A)", field: "proposalDraft" },
    { key: "contract", label: "Contract excerpt (07B) — needs lawyer review", field: "contractDraft" },
    { key: "report", label: "Post-event report (04)", field: "reportDraft" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {docs.map((d) => (
        <div key={d.key} className="rounded border border-[var(--hq-card-border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--hq-text)]">{d.label}</span>
            <button onClick={() => generate(d.key)} disabled={loading === d.key} className="rounded bg-[var(--hq-accent)] px-3 py-1 text-xs text-white disabled:opacity-50">
              {loading === d.key ? "Drafting…" : "AI draft"}
            </button>
          </div>
          <textarea
            defaultValue={(activation[d.field] as string) || ""}
            placeholder="No draft yet — click AI draft, then edit before sending."
            rows={8}
            className="w-full rounded border border-[var(--hq-card-border)] p-2 text-sm"
          />
        </div>
      ))}
    </div>
  );
}
