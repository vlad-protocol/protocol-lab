"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { Bill, Category, Transaction } from "./types";
import { money } from "./types";

export function CalendarTab({
  bills,
  categories,
  transactions,
  month,
  onCreated,
  onDeleted,
}: {
  bills: Bill[];
  categories: Category[];
  transactions: Transaction[];
  month: string; // "YYYY-MM"
  onCreated: (bill: Bill) => void;
  onDeleted: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const [y, m] = month.split("-").map(Number);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() === m - 1;

  const monthTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === m - 1 && t.type === "EXPENSE";
      }),
    [transactions, y, m]
  );

  function isPaid(bill: Bill) {
    return monthTransactions.some(
      (t) =>
        Math.abs(t.amount - bill.amount) < 1 &&
        t.description.toLowerCase().includes(bill.label.toLowerCase().split(" ")[0])
    );
  }

  const sorted = [...bills].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  const totalStillDue = sorted
    .filter((b) => b.active && !isPaid(b))
    .reduce((s, b) => s + b.amount, 0);

  async function handleAdd() {
    if (!label.trim() || !amount) return;
    setSaving(true);
    const res = await fetch("/api/cfo/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        amount: Number(amount),
        dayOfMonth: Number(dayOfMonth),
        category: category || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      onCreated(data.bill);
      setLabel("");
      setAmount("");
      setDayOfMonth("1");
      setCategory("");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/cfo/recurring/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  }

  return (
    <div>
      <p className="text-sm text-[var(--hq-text-muted)]">
        Your fixed recurring bills, listed by day of the month. A bill is marked paid once a
        matching transaction shows up in this month's activity — otherwise it's still due.
      </p>

      {isCurrentMonth && (
        <div className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-3 text-sm">
          <span className="text-[var(--hq-text-muted)]">Still coming out this month: </span>
          <span className="font-semibold text-[var(--hq-text)]">{money(totalStillDue)}</span>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {sorted.map((bill) => {
          const paid = isPaid(bill);
          const isToday = isCurrentMonth && today.getDate() === bill.dayOfMonth;
          return (
            <div
              key={bill.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                isToday ? "border-[var(--hq-accent)] bg-[var(--hq-accent-soft)]" : "border-[var(--hq-card-border)] bg-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {paid ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--hq-text)]">{bill.label}</p>
                  <p className="text-xs text-[var(--hq-text-muted)]">
                    Day {bill.dayOfMonth} of the month{isToday ? " — today" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${paid ? "text-emerald-600" : "text-[var(--hq-text)]"}`}
                >
                  {money(bill.amount)}
                </span>
                <button onClick={() => handleDelete(bill.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-xs text-[var(--hq-text-muted)]">No recurring bills yet — add one below.</p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-[var(--hq-card-border)] bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-[var(--hq-text-muted)]">Add a recurring bill</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Phone bill"
            className="w-40 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-24 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="Day"
            className="w-16 rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-[var(--hq-card-border)] px-2 py-1.5 text-sm"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-[var(--hq-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
