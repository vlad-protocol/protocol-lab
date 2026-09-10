"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Details = {
  id: string;
  industry: string | null;
  website: string | null;
  source: string | null;
  followUpOwner: string | null;
  dateFirstContacted: string | null;
  lastContactDate: string | null;
  totalTouches: number;
  eventOpportunity: string | null;
  dealValue: number | null;
  notes: string | null;
};

function fmtDateInput(dateStr: string | null) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

const inputCls = "w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase text-[var(--hq-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function LeadDetails({ details }: { details: Details }) {
  const router = useRouter();
  const [draft, setDraft] = useState(details);

  async function commit(field: keyof Details) {
    if (draft[field] === details[field]) return;
    await fetch(`/api/contacts/${details.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: draft[field] }),
    });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--hq-text)]">Details</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Industry / category">
          <input className={inputCls} value={draft.industry || ""} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} onBlur={() => commit("industry")} />
        </Field>
        <Field label="Website / LinkedIn">
          <input className={inputCls} value={draft.website || ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} onBlur={() => commit("website")} />
        </Field>
        <Field label="Source">
          <input className={inputCls} value={draft.source || ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} onBlur={() => commit("source")} />
        </Field>
        <Field label="Follow-up owner">
          <input className={inputCls} value={draft.followUpOwner || ""} onChange={(e) => setDraft({ ...draft, followUpOwner: e.target.value })} onBlur={() => commit("followUpOwner")} />
        </Field>
        <Field label="Date first contacted">
          <input type="date" className={inputCls} value={fmtDateInput(draft.dateFirstContacted)} onChange={(e) => setDraft({ ...draft, dateFirstContacted: e.target.value || null })} onBlur={() => commit("dateFirstContacted")} />
        </Field>
        <Field label="Last contact date">
          <input type="date" className={inputCls} value={fmtDateInput(draft.lastContactDate)} onChange={(e) => setDraft({ ...draft, lastContactDate: e.target.value || null })} onBlur={() => commit("lastContactDate")} />
        </Field>
        <Field label="Total touches">
          <input type="number" min={0} className={inputCls} value={draft.totalTouches} onChange={(e) => setDraft({ ...draft, totalTouches: Number(e.target.value) })} onBlur={() => commit("totalTouches")} />
        </Field>
        <Field label="Event / opportunity">
          <input className={inputCls} value={draft.eventOpportunity || ""} onChange={(e) => setDraft({ ...draft, eventOpportunity: e.target.value })} onBlur={() => commit("eventOpportunity")} />
        </Field>
        <Field label="Deal value ($)">
          <input type="number" min={0} className={inputCls} value={draft.dealValue ?? ""} onChange={(e) => setDraft({ ...draft, dealValue: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => commit("dealValue")} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes / objections">
          <textarea rows={3} className={inputCls} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => commit("notes")} />
        </Field>
      </div>
    </div>
  );
}
