"use client";

import { useState } from "react";
import { LayoutGrid, PlusCircle, History, CalendarDays, Target } from "lucide-react";
import type { Bill, Category, Debt, Goal, Transaction } from "./types";
import { OverviewTab } from "./overview-tab";
import { AddTab } from "./add-tab";
import { HistoryTab } from "./history-tab";
import { CalendarTab } from "./calendar-tab";
import { GoalsTab } from "./goals-tab";

type Tab = "overview" | "add" | "history" | "calendar" | "goals";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "add", label: "+ Add", icon: PlusCircle },
  { key: "history", label: "History", icon: History },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "goals", label: "Goals & Debt", icon: Target },
];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function CFOView({
  initialCategories,
  initialTransactions,
  initialBills,
  initialGoals,
  initialDebts,
}: {
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialBills: Bill[];
  initialGoals: Goal[];
  initialDebts: Debt[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [categories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [bills, setBills] = useState(initialBills);
  const [goals, setGoals] = useState(initialGoals);
  const [debts, setDebts] = useState(initialDebts);
  const [month, setMonth] = useState(currentMonthKey());

  const monthOptions = Array.from(new Set(transactions.map((t) => t.date.slice(0, 7))));
  if (!monthOptions.includes(currentMonthKey())) monthOptions.push(currentMonthKey());
  monthOptions.sort().reverse();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hq-card-border)] pb-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--hq-accent)] text-white"
                    : "text-[var(--hq-text-muted)] hover:bg-[var(--hq-canvas)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
        {(tab === "overview" || tab === "calendar") && (
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-[var(--hq-card-border)] bg-white px-2.5 py-1.5 text-sm"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-5">
        {tab === "overview" && (
          <OverviewTab
            categories={categories}
            transactions={transactions}
            month={month}
            onCategoryChange={(id, category) =>
              setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)))
            }
          />
        )}
        {tab === "add" && (
          <AddTab
            categories={categories}
            onSaved={(rows) => setTransactions((prev) => [...rows, ...prev])}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            categories={categories}
            transactions={transactions}
            onDeleted={(id) => setTransactions((prev) => prev.filter((t) => t.id !== id))}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            bills={bills}
            categories={categories}
            transactions={transactions}
            month={month}
            onCreated={(bill) => setBills((prev) => [...prev, bill])}
            onDeleted={(id) => setBills((prev) => prev.filter((b) => b.id !== id))}
          />
        )}
        {tab === "goals" && (
          <GoalsTab
            goals={goals}
            debts={debts}
            onGoalCreated={(g) => setGoals((prev) => [...prev, g])}
            onGoalUpdated={(g) => setGoals((prev) => prev.map((x) => (x.id === g.id ? g : x)))}
            onGoalDeleted={(id) => setGoals((prev) => prev.filter((g) => g.id !== id))}
            onDebtCreated={(d) => setDebts((prev) => [...prev, d])}
            onDebtUpdated={(d) => setDebts((prev) => prev.map((x) => (x.id === d.id ? d : x)))}
            onDebtDeleted={(id) => setDebts((prev) => prev.filter((d) => d.id !== id))}
          />
        )}
      </div>
    </div>
  );
}
