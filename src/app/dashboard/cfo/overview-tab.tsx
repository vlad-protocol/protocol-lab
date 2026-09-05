"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { Category, Transaction } from "./types";
import { money } from "./types";

function statusColor(pct: number) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-emerald-500";
}

function CategorySelect({
  value,
  categories,
  onChange,
}: {
  value: string;
  categories: Category[];
  onChange: (next: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="rounded border border-[var(--hq-card-border)] bg-white px-1.5 py-1 text-xs"
    >
      <option value="uncategorized">Uncategorized</option>
      {categories.map((c) => (
        <option key={c.id} value={c.key}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

export function OverviewTab({
  categories,
  transactions,
  month,
  onCategoryChange,
}: {
  categories: Category[];
  transactions: Transaction[];
  month: string; // "YYYY-MM"
  onCategoryChange: (id: string, category: string) => void;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const inMonth = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth() === m - 1;
    });
    const income = inMonth.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expenses = inMonth.filter((t) => t.type === "EXPENSE");
    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

    const byCategory = new Map<string, number>();
    const transactionsByCategory = new Map<string, Transaction[]>();
    for (const t of expenses) {
      byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
      const list = transactionsByCategory.get(t.category) || [];
      list.push(t);
      transactionsByCategory.set(t.category, list);
    }
    for (const list of transactionsByCategory.values()) {
      list.sort((a, b) => b.amount - a.amount);
    }

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m - 1;
    const daysElapsed = isCurrentMonth ? now.getDate() : new Date(y, m, 0).getDate();
    const daysInMonth = new Date(y, m, 0).getDate();
    const projected = daysElapsed > 0 ? (totalSpent / daysElapsed) * daysInMonth : totalSpent;

    const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 8);

    const allThisMonth = [...inMonth].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      income,
      totalSpent,
      byCategory,
      transactionsByCategory,
      projected,
      top,
      allThisMonth,
      isCurrentMonth,
      daysElapsed,
      daysInMonth,
    };
  }, [transactions, month]);

  const totalBudget = categories.reduce((s, c) => s + c.monthlyBudget, 0);

  async function handleCategoryChange(id: string, category: string) {
    setSavingId(id);
    const res = await fetch(`/api/cfo/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    setSavingId(null);
    if (res.ok) onCategoryChange(id, category);
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs text-[var(--hq-text-muted)]">Income</p>
          <p className="mt-1 text-xl font-semibold text-[var(--hq-text)]">{money(stats.income)}</p>
        </div>
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs text-[var(--hq-text-muted)]">Spent so far</p>
          <p className="mt-1 text-xl font-semibold text-[var(--hq-text)]">{money(stats.totalSpent)}</p>
        </div>
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs text-[var(--hq-text-muted)]">Budget</p>
          <p className="mt-1 text-xl font-semibold text-[var(--hq-text)]">{money(totalBudget)}</p>
        </div>
        <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
          <p className="text-xs text-[var(--hq-text-muted)]">
            {stats.isCurrentMonth ? "Projected month-end" : "Net"}
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              stats.isCurrentMonth
                ? stats.projected > totalBudget && totalBudget > 0
                  ? "text-red-600"
                  : "text-[var(--hq-text)]"
                : "text-[var(--hq-text)]"
            }`}
          >
            {stats.isCurrentMonth ? money(stats.projected) : money(stats.income - stats.totalSpent)}
          </p>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-[var(--hq-text)]">Budget by category</h3>
      <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
        Click a category to see its transactions this month — you can recategorize any of them right there.
      </p>
      <div className="mt-2 flex flex-col gap-2.5">
        {categories.map((cat) => {
          const spent = stats.byCategory.get(cat.key) || 0;
          const pct = cat.monthlyBudget > 0 ? Math.min(150, (spent / cat.monthlyBudget) * 100) : spent > 0 ? 100 : 0;
          const isOpen = openCategory === cat.key;
          const catTransactions = stats.transactionsByCategory.get(cat.key) || [];
          return (
            <div key={cat.id} className="rounded-lg border border-[var(--hq-card-border)] bg-white">
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat.key)}
                className="flex w-full items-center gap-2 p-3 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--hq-text)]">
                      {cat.label}
                      {catTransactions.length > 0 && (
                        <span className="ml-1.5 text-[var(--hq-text-muted)]">({catTransactions.length})</span>
                      )}
                    </span>
                    <span className="text-[var(--hq-text-muted)]">
                      {money(spent)} / {cat.monthlyBudget > 0 ? money(cat.monthlyBudget) : "no budget set"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--hq-canvas)]">
                    <div
                      className={`h-full rounded-full ${statusColor(pct)}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-[var(--hq-card-border)] px-3 py-2">
                  {catTransactions.length === 0 ? (
                    <p className="py-1 text-xs text-[var(--hq-text-muted)]">
                      No transactions in this category this month.
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y divide-[var(--hq-card-border)]">
                      {catTransactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[var(--hq-text)]">{t.description}</p>
                            <p className="text-[var(--hq-text-muted)]">
                              {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className="font-medium text-[var(--hq-text)]">{money(t.amount)}</span>
                          <CategorySelect
                            value={t.category}
                            categories={categories}
                            onChange={(next) => handleCategoryChange(t.id, next)}
                          />
                          {savingId === t.id && <span className="text-[var(--hq-text-muted)]">saving…</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stats.isCurrentMonth && stats.projected > totalBudget && totalBudget > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            At your current pace ({stats.daysElapsed}/{stats.daysInMonth} days in), you're on track to spend{" "}
            {money(stats.projected)} this month against a {money(totalBudget)} budget.
          </span>
        </div>
      )}

      <h3 className="mt-6 text-sm font-semibold text-[var(--hq-text)]">Top expenses this month</h3>
      <div className="mt-2 flex flex-col gap-1.5">
        {stats.top.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
          >
            <span className="text-[var(--hq-text)]">{t.description}</span>
            <span className="font-medium text-[var(--hq-text)]">{money(t.amount)}</span>
          </div>
        ))}
        {stats.top.length === 0 && (
          <p className="text-xs text-[var(--hq-text-muted)]">No expenses logged for this month yet.</p>
        )}
      </div>

      <h3 className="mt-6 text-sm font-semibold text-[var(--hq-text)]">All transactions this month</h3>
      <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
        Every transaction for this month, income included — change a category right here without switching tabs.
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {stats.allThisMonth.map((t) => (
              <tr key={t.id} className="border-b border-[var(--hq-card-border)] last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--hq-text-muted)]">
                  {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </td>
                <td className="px-3 py-2 text-[var(--hq-text)]">{t.description}</td>
                <td className="px-3 py-2">
                  <CategorySelect
                    value={t.category}
                    categories={categories}
                    onChange={(next) => handleCategoryChange(t.id, next)}
                  />
                  {savingId === t.id && (
                    <span className="ml-1.5 text-xs text-[var(--hq-text-muted)]">saving…</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-[var(--hq-text)]"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {money(t.amount)}
                </td>
              </tr>
            ))}
            {stats.allThisMonth.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-[var(--hq-text-muted)]">
                  No transactions logged for this month yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
