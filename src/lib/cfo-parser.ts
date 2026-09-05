// Turns a raw copy-paste of your Wealthsimple activity feed into structured
// rows. Wealthsimple has no public API (confirmed — see README), so this is
// the practical alternative: copy the activity list, paste it in, review the
// parsed rows, fix anything wrong, save.
//
// The pasted text is messy — merchant name, account type, a relative day
// label, and the amount all run together with no reliable delimiters, and
// there's no real calendar date in it at all, just section headers like
// "Today" / "Yesterday". So this parser is deliberately conservative: it
// anchors on the one thing that's always well-formed (the dollar amount),
// pulls a best-guess merchant name and date from the surrounding text, and
// leaves everything editable in the UI before it's saved — that review step
// is what actually makes this reliable, not the regex.

export type ParsedRow = {
  date: string; // ISO date
  description: string;
  amount: number; // positive
  type: "INCOME" | "EXPENSE";
  pending: boolean;
  rawText: string;
  category: string; // best-guess from merchant rules, else "uncategorized"
};

const NOISE_WORDS = [
  "purchase",
  "interac e-transfer",
  "e-transfer",
  "direct deposit",
  "payroll",
  "bill payment",
  "pre-authorized debit",
  "chequing",
  "save",
  "invest",
  "pending",
  "completed",
  "cad",
  "download activities",
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function stripNoise(text: string) {
  let cleaned = text.replace(/•/g, " ");
  // Drop the account-type / relative-day fragment, e.g. "Chequing Day 2 Day"
  cleaned = cleaned.replace(/\bday\s*\d+\s*day\b/gi, " ");
  for (const w of NOISE_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

function resolveDateContext(headerText: string, today: Date): Date | null {
  const t = headerText.trim().toLowerCase();
  if (!t) return null;
  if (t === "today") return today;
  if (t === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }
  const weekdayIdx = WEEKDAYS.indexOf(t);
  if (weekdayIdx !== -1) {
    const d = new Date(today);
    const diff = (d.getDay() - weekdayIdx + 7) % 7 || 7; // most recent past occurrence
    d.setDate(d.getDate() - diff);
    return d;
  }
  // "Apr 24", "April 24", "Apr 24, 2026"
  const parsed = new Date(`${headerText} ${today.getFullYear()}`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

export function parseWealthsimpleText(raw: string, today: Date = new Date()): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = raw.split(/\r?\n/);

  let currentDate = today;
  let buffer: string[] = [];

  const amountPattern = /([+\-−–])\s*\$\s*([\d,]+\.\d{2})/;

  function flush(pendingFlag: boolean) {
    if (buffer.length === 0) return;
    const chunk = buffer.join(" ");
    buffer = [];
    if (/reversed/i.test(chunk)) return; // Wealthsimple's own reversal noise — skip entirely

    const match = chunk.match(amountPattern);
    if (!match) return;

    const sign = match[1];
    const amount = Number(match[2].replace(/,/g, ""));
    if (!amount) return;
    const type: ParsedRow["type"] = sign === "+" ? "INCOME" : "EXPENSE";

    const description = stripNoise(chunk.slice(0, match.index)) || stripNoise(chunk) || "Unknown";

    rows.push({
      date: currentDate.toISOString().slice(0, 10),
      description: description.slice(0, 120),
      amount,
      type,
      pending: pendingFlag || /pending/i.test(chunk),
      rawText: chunk.trim().slice(0, 300),
      category: "uncategorized",
    });
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const asDate = resolveDateContext(line, today);
    if (asDate && line.length < 20) {
      // A bare date/section header on its own line — flush whatever we were
      // building (in case a transaction had no trailing newline) and move
      // the date context forward.
      flush(false);
      currentDate = asDate;
      continue;
    }

    buffer.push(line);
    if (amountPattern.test(line)) {
      flush(false);
    }
  }
  flush(false);

  // A single-line paste (everything flattened, as markdown sometimes does)
  // won't have hit the per-line branch above — fall back to splitting the
  // whole string on the amount pattern directly.
  if (rows.length === 0 && amountPattern.test(raw)) {
    const global = new RegExp(amountPattern.source, "g");
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    const chunks: string[] = [];
    while ((m = global.exec(raw))) {
      const end = m.index + m[0].length + 20; // grab a little trailing context (e.g. "CAD Pending")
      chunks.push(raw.slice(lastIndex, Math.min(end, raw.length)));
      lastIndex = m.index + m[0].length;
    }
    for (const chunk of chunks) {
      if (/reversed/i.test(chunk)) continue;
      const match = chunk.match(amountPattern);
      if (!match) continue;
      const sign = match[1];
      const amount = Number(match[2].replace(/,/g, ""));
      if (!amount) continue;
      rows.push({
        date: today.toISOString().slice(0, 10),
        description: stripNoise(chunk.slice(0, match.index)).slice(0, 120) || "Unknown",
        amount,
        type: sign === "+" ? "INCOME" : "EXPENSE",
        pending: /pending/i.test(chunk),
        rawText: chunk.trim().slice(0, 300),
        category: "uncategorized",
      });
    }
  }

  return rows;
}

export function applyMerchantRules(
  rows: ParsedRow[],
  rules: { matchText: string; category: string }[]
): ParsedRow[] {
  // Longest match wins, so a specific rule ("uber eats") beats a broad one
  // ("uber") when both match the same description.
  const sorted = [...rules].sort((a, b) => b.matchText.length - a.matchText.length);
  return rows.map((row) => {
    const desc = row.description.toLowerCase();
    const hit = sorted.find((r) => desc.includes(r.matchText.toLowerCase()));
    return hit ? { ...row, category: hit.category } : row;
  });
}
