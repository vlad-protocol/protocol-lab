"use client";

import { useMemo, useState } from "react";
import { Trash2, Search, ShieldCheck, Loader2 } from "lucide-react";
import type { Category, Transaction } from "./types";
import { money } from "./types";

type DuplicateGroup = {
  key: string;
  count: number;
  keep: Transaction & { createdAt: string };
  extras: (Transaction & { createdAt: string })[];
};

export function HistoryTab({
  categories,
  transactions,
  onDeleted,
  onManyDeleted,
}: {
  categories: Category[];
  transactions: Transaction[];
  onDeleted: (id: string) => void;
  onManyDeleted: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dupChecking, setDupChecking] = useState(false);
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[] | null>(null);
  const [dupResolving, setDupResolving] = useState(false);
  const [dupError, setDupError] = useState<string | null>(null);

  const categoryLabel = useMemo(() => {
    const m = new Map(categories.map((c) => [c.key, c.label]));
    return (key: string) => m.get(key) || key;
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (q.trim() && !t.description.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [transactions, q, categoryFilter, typeFilter]);

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/cfo/transactions/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) onDeleted(id);
  }

  async function checkDuplicates() {
    setDupChecking(true);
    setDupError(null);
    const res = await fetch("/api/cfo/transactions/duplicates");
    const d = await res.json().catch(() => null);
    setDupChecking(false);
    if (!res.ok || !d) {
      setDupError("Couldn't check for duplicates.");
      return;
    }
    setDupGroups(d.duplicateGroups);
  }

  async function resolveDuplicates() {
    setDupResolving(true);
    const res = await fetch("/api/cfo/transactions/duplicates", { method: "DELETE" });
    const d = await res.json().catch(() => null);
    setDupResolving(false);
    if (!res.ok || !d) {
      setDupError("Couldn't remove duplicates.");
      return;
    }
    const removedIds = (dupGroups || []).flatMap((g) => g.extras.map((e) => e.id));
    onManyDeleted(removedIds);
    setDupGroups([]);
  }

  const extraCount = (dupGroups || []).reduce((sum, g) => sum + g.extras.length, 0);

  return (
    <div>
      <div className="mb-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={checkDuplicates}
            disabled={dupChecking}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--hq-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)] disabled:opacity-60"
          >
            {dupChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {dupChecking ? "Checking…" : "Check for duplicate transactions"}
          </button>
          {dupGroups !== null && dupGroups.length === 0 && (
            <span className="text-xs text-emerald-600">No duplicates found — everything's clean.</span>
          )}
          {dupGroups !== null && dupGroups.length > 0 && (
            <>
              <span className="text-xs text-amber-700">
                Found {dupGroups.length} duplicate transaction{dupGroups.length === 1 ? "" : "s"} ({extraCount}{" "}
                extra row{extraCount === 1 ? "" : "s"} to remove).
              </span>
              <button
                onClick={resolveDuplicates}
                disabled={dupResolving}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                {dupResolving ? "Removing…" : `Remove ${extraCount} duplicate${extraCount === 1 ? "" : "s"}`}
              </button>
            </>
          )}
          {dupError && <span className="text-xs text-red-600">{dupError}</span>}
        </div>
        {dupGroups !== null && dupGroups.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-[var(--hq-card-border)] text-xs">
            {dupGroups.map((g) => (
              <div key={g.key} className="border-b border-[var(--hq-card-border)] px-2.5 py-1.5 last:border-0">
                <span className="font-medium text-[var(--hq-text)]">
                  {new Date(g.keep.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                  {money(g.keep.amount)}
                </span>{" "}
                <span className="text-[var(--hq-text-muted)]">
                  {g.keep.description} — appears {g.count}x, keeping 1, removing {g.extras.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[180px] items-center gap-1.5 rounded-lg border border-[var(--hq-card-border)] bg-white px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search description..."
            className="w-full text-sm outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "INCOME" | "EXPENSE")}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2.5 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="EXPENSE">Expenses</option>
          <option value="INCOME">Income</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2.5 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-[var(--hq-card-border)] last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                  {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </td>
                <td className="px-3 py-2 text-[var(--hq-text)]">
                  {t.description}
                  {t.pending && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      pending
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                  {categoryLabel(t.category)}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={
                      t.type === "INCOME"
                        ? "rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700"
                        : "rounded-full bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-600"
                    }
                  >
                    {t.type === "INCOME" ? "Income" : "Expense"}
                  </span>
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-[var(--hq-text)]"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {money(t.amount)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}>
                    <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-[var(--hq-text-muted)]">
                  No transactions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
