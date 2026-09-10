// Duplicate detection for CFO transactions.
//
// Wealthsimple's CSV export has no stable transaction ID, so the only way
// to recognize "this is the same transaction I already imported" is by
// matching on what the export actually gives us: the date, the amount,
// the type (income/expense), and the raw line/text it came from. Date +
// amount alone (what's asked for) is the common case for an accidental
// re-import — someone uploads the same CSV twice, or pastes the same
// activity feed again — but two different legitimate transactions can
// coincidentally share a date and amount (e.g. two $12 coffees on the
// same day), so rawText (falling back to description) is included as a
// tie-breaker: a true re-import has the exact same source line, while two
// separate transactions that just happen to match on date+amount won't.

export function normalizeDedupText(s: string | null | undefined) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function dedupKey(t: {
  date: Date | string;
  amount: number;
  type: string;
  rawText?: string | null;
  description: string;
}) {
  const iso = typeof t.date === "string" ? t.date : t.date.toISOString();
  const day = iso.slice(0, 10);
  const amt = Math.abs(t.amount).toFixed(2);
  const text = normalizeDedupText(t.rawText) || normalizeDedupText(t.description);
  return `${day}|${amt}|${t.type}|${text}`;
}
