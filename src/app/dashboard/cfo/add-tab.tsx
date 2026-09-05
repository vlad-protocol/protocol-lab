"use client";

import { useRef, useState } from "react";
import { Sparkles, Trash2, Save, Upload } from "lucide-react";
import type { Category, Transaction } from "./types";
import { money } from "./types";

type DraftRow = {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  pending: boolean;
  rawText: string;
  rememberRule: boolean;
};

export function AddTab({
  categories,
  onSaved,
}: {
  categories: Category[];
  onSaved: (rows: Transaction[]) => void;
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runParse(payload: { text: string; format: "text" | "csv" }) {
    setError(null);
    setParsing(true);
    const res = await fetch("/api/cfo/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setParsing(false);
    if (!res.ok) {
      setError(data.error || "Couldn't parse that.");
      return;
    }
    setRows(
      data.rows.map((r: Omit<DraftRow, "rememberRule">) => ({ ...r, rememberRule: false }))
    );
  }

  async function handleParse() {
    if (!text.trim()) return;
    await runParse({ text, format: "text" });
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    await runParse({ text: csvText, format: "csv" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateRow(i: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/cfo/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((r) => ({
          ...r,
          matchText: r.description.toLowerCase().split(" ").slice(0, 3).join(" "),
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      onSaved(data.transactions);
      setRows([]);
      setText("");
    } else {
      setError(data.error || "Couldn't save.");
    }
  }

  const totalIncome = rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const totalExpense = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <p className="text-sm text-[var(--hq-text-muted)]">
        Best option: Wealthsimple → Chequing → Activity → "Download activities" gives you a CSV
        with real dates and amounts — upload it below. No merchant names come through in that
        export, so those rows land as "Card purchase" for you to categorize. Alternatively, copy
        and paste the activity feed as text — either way, review every row before saving.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCSVUpload}
          className="hidden"
          id="cfo-csv-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--hq-card-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--hq-text)] disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> Upload Wealthsimple CSV
        </button>
        <span className="text-xs text-[var(--hq-text-muted)]">or paste text below</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your Wealthsimple activity feed here..."
        rows={8}
        className="mt-3 w-full rounded-lg border border-[var(--hq-card-border)] px-3 py-2 font-mono text-xs"
      />
      <button
        onClick={handleParse}
        disabled={parsing || !text.trim()}
        className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" /> {parsing ? "Parsing…" : "Parse"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {rows.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--hq-text-muted)]">
            <span>
              {rows.length} rows parsed — {money(totalIncome)} income, {money(totalExpense)} expenses
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--hq-card-border)] bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Always use this category?</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--hq-card-border)] last:border-0">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(i, { date: e.target.value })}
                        className="rounded border border-[var(--hq-card-border)] px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.description}
                        onChange={(e) => updateRow(i, { description: e.target.value })}
                        className="w-48 rounded border border-[var(--hq-card-border)] px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) => updateRow(i, { amount: Number(e.target.value) })}
                        className="w-20 rounded border border-[var(--hq-card-border)] px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(i, { type: e.target.value as "INCOME" | "EXPENSE" })}
                        className="rounded border border-[var(--hq-card-border)] px-1.5 py-1 text-xs"
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(i, { category: e.target.value })}
                        className="rounded border border-[var(--hq-card-border)] px-1.5 py-1 text-xs"
                      >
                        <option value="uncategorized">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.rememberRule}
                        onChange={(e) => updateRow(i, { rememberRule: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeRow(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : `Save ${rows.length} transactions`}
          </button>
        </div>
      )}
    </div>
  );
}
