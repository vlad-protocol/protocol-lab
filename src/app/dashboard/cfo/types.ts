export type Category = {
  id: string;
  key: string;
  label: string;
  monthlyBudget: number;
  order: number;
  // Present when a category's budget has been fetched for a specific month
  // (see getEffectiveCategories): defaultBudget is the normal recurring
  // value, monthlyBudget reflects that month's one-off override if any.
  defaultBudget?: number;
  isOverridden?: boolean;
  month?: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  pending: boolean;
  rawText: string | null;
};

export type Bill = {
  id: string;
  label: string;
  amount: number;
  dayOfMonth: number;
  category: string | null;
  active: boolean;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedSoFar: number;
  targetDate: string | null;
};

export type Debt = {
  id: string;
  name: string;
  balance: number;
  monthlyPayment: number;
};

export function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "CAD" });
}
