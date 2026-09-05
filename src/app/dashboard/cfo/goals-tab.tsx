"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Debt, Goal } from "./types";
import { money } from "./types";

export function GoalsTab({
  goals,
  debts,
  onGoalCreated,
  onGoalUpdated,
  onGoalDeleted,
  onDebtCreated,
  onDebtUpdated,
  onDebtDeleted,
}: {
  goals: Goal[];
  debts: Debt[];
  onGoalCreated: (g: Goal) => void;
  onGoalUpdated: (g: Goal) => void;
  onGoalDeleted: (id: string) => void;
  onDebtCreated: (d: Debt) => void;
  onDebtUpdated: (d: Debt) => void;
  onDebtDeleted: (id: string) => void;
}) {
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");

  const [debtName, setDebtName] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtPayment, setDebtPayment] = useState("");

  async function addGoal() {
    if (!goalName.trim() || !goalTarget) return;
    const res = await fetch("/api/cfo/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: goalName,
        targetAmount: Number(goalTarget),
        targetDate: goalDate || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onGoalCreated(data.goal);
      setGoalName("");
      setGoalTarget("");
      setGoalDate("");
    }
  }

  async function updateGoalSaved(goal: Goal, savedSoFar: number) {
    const res = await fetch(`/api/cfo/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedSoFar }),
    });
    const data = await res.json();
    if (res.ok) onGoalUpdated(data.goal);
  }

  async function deleteGoal(id: string) {
    const res = await fetch(`/api/cfo/goals/${id}`, { method: "DELETE" });
    if (res.ok) onGoalDeleted(id);
  }

  async function addDebt() {
    if (!debtName.trim() || !debtBalance) return;
    const res = await fetch("/api/cfo/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: debtName,
        balance: Number(debtBalance),
        monthlyPayment: Number(debtPayment || 0),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onDebtCreated(data.debt);
      setDebtName("");
      setDebtBalance("");
      setDebtPayment("");
    }
  }

  async function updateDebtBalance(debt: Debt, balance: number) {
    const res = await fetch(`/api/cfo/debts/${debt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance }),
    });
    const data = await res.json();
    if (res.ok) onDebtUpdated(data.debt);
  }

  async function deleteDebt(id: string) {
    const res = await fetch(`/api/cfo/debts/${id}`, { method: "DELETE" });
    if (res.ok) onDebtDeleted(id);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-[var(--hq-text)]">Savings goals</h3>
        <div className="mt-2 flex flex-col gap-2.5">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.savedSoFar / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--hq-text)]">{g.name}</span>
                  <button onClick={() => deleteGoal(g.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                  </button>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--hq-canvas)]">
                  <div className="h-full rounded-full bg-[var(--hq-accent)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--hq-text-muted)]">
                  <span>
                    {money(g.savedSoFar)} of {money(g.targetAmount)} ({pct.toFixed(0)}%)
                  </span>
                  {g.targetDate && <span>by {new Date(g.targetDate).toLocaleDateString()}</span>}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Update saved amount"
                    className="w-full rounded border border-[var(--hq-card-border)] px-2 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Number((e.target as HTMLInputElement).value);
                        if (!Number.isNaN(val)) updateGoalSaved(g, val);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
          {goals.length === 0 && (
            <p className="text-xs text-[var(--hq-text-muted)]">No goals yet — add one below.</p>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Add a goal</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Winter fund"
              className="w-32 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="Target $"
              className="w-24 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              className="rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            />
            <button
              onClick={addGoal}
              className="flex items-center gap-1 rounded-lg bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--hq-text)]">Debt tracker</h3>
        <div className="mt-2 flex flex-col gap-2.5">
          {debts.map((d) => (
            <div key={d.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--hq-text)]">{d.name}</span>
                <button onClick={() => deleteDebt(d.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[var(--hq-text-muted)]">
                <span>Balance: {money(d.balance)}</span>
                <span>Monthly payment: {money(d.monthlyPayment)}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Update balance"
                  className="w-full rounded border border-[var(--hq-card-border)] px-2 py-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (!Number.isNaN(val)) updateDebtBalance(d, val);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            </div>
          ))}
          {debts.length === 0 && (
            <p className="text-xs text-[var(--hq-text-muted)]">No debts tracked — add one below.</p>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Add a debt</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={debtName}
              onChange={(e) => setDebtName(e.target.value)}
              placeholder="e.g. Credit card"
              className="w-32 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={debtBalance}
              onChange={(e) => setDebtBalance(e.target.value)}
              placeholder="Balance"
              className="w-24 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={debtPayment}
              onChange={(e) => setDebtPayment(e.target.value)}
              placeholder="Monthly payment"
              className="w-28 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
            />
            <button
              onClick={addDebt}
              className="flex items-center gap-1 rounded-lg bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
