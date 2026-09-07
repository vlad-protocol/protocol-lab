// Kept deliberately short — 8 categories, chosen so the list stays scannable
// at a glance instead of scrolling through a dozen fine-grained buckets.
// Budgets start at $0 for you to fill in. Rename, delete, or add categories
// freely; if you add fine-grained ones later you can always re-run the
// simplification logic in cfo-server.ts by hand.
export const DEFAULT_CFO_CATEGORIES: { key: string; label: string }[] = [
  { key: "housing", label: "Housing" },
  { key: "groceries", label: "Groceries" },
  { key: "dining_cafes", label: "Dining & Cafes" },
  { key: "transport", label: "Transport & Gas" },
  { key: "bills_debt", label: "Bills & Debt" },
  { key: "personal_wants", label: "Personal & Wants" },
  { key: "business", label: "Business" },
  { key: "income", label: "Income" },
  { key: "other", label: "Everything Else" },
];

// A one-time consolidation map from the earlier 15-category set down to the
// 8 above. Keys not listed here (the 8 canonical ones, plus "uncategorized")
// are left as-is. Used by cfo-server.ts to migrate existing accounts
// automatically the next time their CFO page loads — no manual step needed.
export const CATEGORY_MERGE_MAP: Record<string, string> = {
  dining_out: "dining_cafes",
  cafes: "dining_cafes",
  desserts: "dining_cafes",
  gas: "transport",
  subscriptions: "bills_debt",
  utilities: "bills_debt",
  debt: "bills_debt",
  shopping: "personal_wants",
  fitness: "personal_wants",
  social_transfers: "other",
};
