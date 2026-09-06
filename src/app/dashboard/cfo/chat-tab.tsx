"use client";

import { useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { Category, Debt, Goal, Transaction } from "./types";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "Am I on track with the budget you built me?",
  "Where should the $400 credit card payoff actually come from this month?",
  "What's the fastest realistic way to cut my 'Everything Else' spending?",
  "How should I split money between investing and savings each month?",
];

export function ChatTab({
  categories,
  transactions,
  goals,
  debts,
}: {
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // A compact summary of real, current app data — sent with every request so
  // the model's advice references actual numbers, not generic tips. Nothing
  // here is stored server-side; it's assembled fresh from what's already
  // loaded in this tab.
  const context = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1); // last ~3 months
    const recent = transactions.filter((t) => new Date(t.date) >= cutoff);
    const byCategory = new Map<string, { income: number; expense: number }>();
    for (const t of recent) {
      const entry = byCategory.get(t.category) || { income: 0, expense: 0 };
      if (t.type === "INCOME") entry.income += t.amount;
      else entry.expense += t.amount;
      byCategory.set(t.category, entry);
    }
    const months = Math.max(1, (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    const lines: string[] = [];
    lines.push("Categories and monthly budgets:");
    for (const c of categories) {
      const stat = byCategory.get(c.key);
      const avgSpent = stat ? (stat.expense / months).toFixed(0) : "0";
      lines.push(`- ${c.label} (${c.key}): budget $${c.monthlyBudget}/mo, real recent average ~$${avgSpent}/mo`);
    }
    if (goals.length > 0) {
      lines.push("Goals:");
      for (const g of goals) {
        lines.push(`- ${g.name}: $${g.savedSoFar} saved of $${g.targetAmount}${g.targetDate ? ` by ${g.targetDate.slice(0, 10)}` : ""}`);
      }
    }
    if (debts.length > 0) {
      lines.push("Debts:");
      for (const d of debts) {
        lines.push(`- ${d.name}: $${d.balance} balance, $${d.monthlyPayment}/mo payment`);
      }
    }
    return lines.join("\n");
  }, [categories, transactions, goals, debts]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cfo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Couldn't reach the CFO chat. Check your connection and try again.");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--hq-text)]">
        <Sparkles className="h-4 w-4 text-[var(--hq-accent)]" /> Personal CFO Chat
      </div>
      <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
        Talk through your spending, your budget, and your goals — it sees your real categories, budgets, goals, and
        debts, so it can give specific answers instead of generic tips.
      </p>

      <div className="mt-4 flex min-h-[360px] flex-col rounded-xl border border-[var(--hq-card-border)] bg-white">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--hq-text-muted)]">Try asking:</p>
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-fit rounded-full border border-[var(--hq-card-border)] px-3 py-1.5 text-left text-xs text-[var(--hq-text)] hover:bg-[var(--hq-canvas)]"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-[var(--hq-accent)] text-white"
                    : "bg-[var(--hq-canvas)] text-[var(--hq-text)]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[var(--hq-canvas)] px-3.5 py-2 text-sm text-[var(--hq-text-muted)]">
                Thinking…
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-[var(--hq-card-border)] p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your budget, a purchase, or your goals…"
            className="flex-1 rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--hq-accent)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        </form>
      </div>
      <p className="mt-2 text-[11px] text-[var(--hq-text-muted)]">
        Chat history isn&apos;t saved — it resets when you leave this tab. Nothing here is financial or tax advice.
      </p>
    </div>
  );
}
