"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { Category, Transaction } from "./types";
import { money } from "./types";

function statusColor(pct: number) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-emerald-500";
}

export function OverviewTab({
  categories,
  transactions,
  month,
}: {
  categories: Category[];
  transactions: Transaction[];
  month: string; // "YYYY-MM"
}) {
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
    for (const t of expenses) byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m - 1;
    const daysElapsed = isCurrentMonth ? now.getDate() : new Date(y, m, 0).getDate();
    const daysInMonth = new Date(y, m, 0).getDate();
    const projected = daysElapsed > 0 ? (totalSpent / daysElapsed) * daysInMonth : totalSpent;

    const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 8);

    return { income, totalSpent, byCategory, projected, top, isCurrentMonth, daysElapsed, daysInMonth };
  }, [transactions, month]);

  const totalBudget = categories.reduce((s, c) => s + c.monthlyBudget, 0);

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
      <div className="mt-2 flex flex-col gap-2.5">
        {categories.map((cat) => {
          const spent = stats.byCategory.get(cat.key) || 0;
          const pct = cat.monthlyBudget > 0 ? Math.min(150, (spent / cat.monthlyBudget) * 100) : spent > 0 ? 100 : 0;
          return (
            <div key={cat.id} className="rounded-lg border border-[var(--hq-card-border)] bg-white p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--hq-text)]">{cat.label}</span>
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
    </div>
  );
}
