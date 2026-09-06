// A one-time, personalized budget recommendation built from Vlad's real
// 3-month transaction history (June-Sept 2026) plus the new fixed costs he
// described: ~$950/mo rent (new apartment) and a $400 credit card balance
// to clear. Framework: Ramit Sethi's Conscious Spending Plan (I Will Teach
// You To Be Rich) — Fixed Costs, Investments, Savings, Guilt-Free Spending —
// applied to his RELIABLE income only (payroll + his regular bank transfers +
// personal e-transfer income), not his lumpy Zeffy/business revenue, which
// is treated as a bonus stream on top rather than baked into the baseline.
//
// Reliable monthly income used as the baseline: ~$5,445
// (payroll ~$1,942 + regular incoming transfers ~$3,111 + misc personal
// income ~$392, averaged over the 97-day sample period)
//
// This only sets the 6 spending categories — "income" isn't a spending
// budget, and "business" is included at a self-funding level (his Zeffy/
// event revenue covers it) rather than drawn from personal income.
export const RAMIT_BUDGET_PLAN = {
  reliableMonthlyIncome: 5445,
  updated: "2026-09-06",
  categoryBudgets: {
    housing: 950, // new rent
    groceries: 650, // close to his real ~$635/mo average — a necessity, not a cut
    transport: 650, // close to his real ~$649/mo average
    bills_debt: 275, // subscriptions + minimums, close to his real average
    dining_cafes: 550, // down from a real ~$1,474/mo average — the first target cut
    other: 700, // down from a real ~$3,147/mo average — by far the biggest target cut
    business: 450, // self-funded by ~$650/mo Zeffy/event revenue, not personal income
  } as Record<string, number>,
  notes: [
    "Fixed costs (housing + groceries + transport + bills & debt) land at about $2,525/mo — 46% of reliable income, inside Ramit's 50-60% target with room to spare.",
    "Guilt-free spending (dining + everything else) is targeted at $1,250/mo — down from a real ~$4,621/mo combined average. That gap is the single biggest lever here.",
    "That leaves roughly $1,670/mo (31%) for the credit card payoff, investing, and savings — well above Ramit's usual 10%+10% target.",
    "Recommended split of that $1,670: pay off the $400 card in month one, then automate ~10% ($545) to investing and ~10% ($545) to savings/emergency fund, keeping the rest as buffer.",
    "Zeffy/business revenue (~$650/mo, irregular) isn't counted in the baseline — treat any month it lands as a bonus toward the card, investing, or savings, not everyday spending.",
  ],
};
