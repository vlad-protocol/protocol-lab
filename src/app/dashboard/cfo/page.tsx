import { PiggyBank } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { getOrSeedCategories } from "@/lib/cfo-server";
import { CFOView } from "./cfo-view";

export const dynamic = "force-dynamic";

export default async function CFOPage() {
  const session = await requireAccess("cfo");
  const userId = session.user.id;

  const [categories, transactions, bills, goals, debts] = await Promise.all([
    getOrSeedCategories(userId),
    prisma.cFOTransaction.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.cFORecurringBill.findMany({ where: { userId }, orderBy: { dayOfMonth: "asc" } }),
    prisma.cFOGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.cFODebt.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="max-w-6xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <PiggyBank className="h-6 w-6 text-[var(--hq-accent)]" />
          CFO
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Your personal budget, cashflow, and goals — private to your account.
          No bank has a public API for personal accounts (Wealthsimple
          included), so this runs on a weekly ritual: copy your activity feed,
          paste it into "Add", review, save.
        </p>
      </div>

      <div className="mt-6">
        <CFOView
          initialCategories={categories}
          initialTransactions={transactions.map((t) => ({ ...t, date: t.date.toISOString() }))}
          initialBills={bills}
          initialGoals={goals.map((g) => ({
            ...g,
            targetDate: g.targetDate ? g.targetDate.toISOString() : null,
          }))}
          initialDebts={debts}
        />
      </div>
    </div>
  );
}
