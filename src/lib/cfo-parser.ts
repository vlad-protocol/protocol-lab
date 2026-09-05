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

// Keyword → category guesses, built directly from a real activity history
// (Vlad's, June–Sept 2026) rather than generic assumptions. Order matters:
// earlier entries win when a description could match more than one (e.g.
// "uber canada/uberonemem" — the One membership — must be checked before
// the generic "uber" transport match). This runs automatically on every
// parse; a saved merchant rule (from "always use this category") always
// overrides it.
const CATEGORY_KEYWORDS: { pattern: RegExp; category: string }[] = [
  // Housing
  { pattern: /cogir|rent/i, category: "housing" },

  // Subscriptions (recurring software/media, not one-off purchases)
  { pattern: /uberonemem/i, category: "subscriptions" },
  { pattern: /apple\.com/i, category: "subscriptions" },
  { pattern: /spotify/i, category: "subscriptions" },
  { pattern: /netflix/i, category: "subscriptions" },

  // Utilities & bills
  { pattern: /videotron/i, category: "utilities" },
  { pattern: /hydro/i, category: "utilities" },
  { pattern: /\bsaaq\b/i, category: "utilities" },

  // Business (tools, ad spend, event/ticketing platforms, agency-side income)
  { pattern: /netlify/i, category: "business" },
  { pattern: /godaddy/i, category: "business" },
  { pattern: /anthropic/i, category: "business" },
  { pattern: /laylo/i, category: "business" },
  { pattern: /facebk|facebook ads|meta ads/i, category: "business" },
  { pattern: /weezevent/i, category: "business" },
  { pattern: /^zeffy/i, category: "business" },
  { pattern: /pivot studio/i, category: "business" },
  { pattern: /groupe plus/i, category: "business" },

  // Fitness & training
  { pattern: /anytime\s*fitn/i, category: "fitness" },
  { pattern: /gym callisthenie|calisthenics gym/i, category: "fitness" },
  { pattern: /academie d.?arts mart/i, category: "fitness" },

  // Transport (transit, bike share, parking, rideshare rides — not the Uber One membership above)
  { pattern: /\bbixi\b/i, category: "transport" },
  { pattern: /agence de mobilite/i, category: "transport" },
  { pattern: /uber.*trip|ubertrip/i, category: "transport" },
  { pattern: /\bstm\b/i, category: "transport" },
  { pattern: /honk parking/i, category: "transport" },
  { pattern: /air-serv/i, category: "transport" },

  // Gas
  { pattern: /petro-?canada/i, category: "gas" },
  { pattern: /\bshell\b/i, category: "gas" },
  { pattern: /\bultramar\b/i, category: "gas" },
  { pattern: /costco essence/i, category: "gas" },
  { pattern: /harnois/i, category: "gas" },
  { pattern: /gas bar/i, category: "gas" },
  { pattern: /couche.?tard|couchetard/i, category: "gas" },
  { pattern: /\besso\b/i, category: "gas" },

  // Cafes
  { pattern: /tim hortons/i, category: "cafes" },
  { pattern: /starbucks|sbux/i, category: "cafes" },
  { pattern: /\bcafe\b|caf[ée]/i, category: "cafes" },
  { pattern: /presotea|brulerie|b\.hive|espresso bar|gong cha/i, category: "cafes" },

  // Desserts
  { pattern: /uncle tetsu|dairy queen|havre aux glaces|leche desserts|radikal dezzertz|patisserie|boulangerie|tarterie|krispy kreme|wow-gateaux|desserts etc|premiere moisson|creperie|creamerie|glaces\b/i, category: "desserts" },

  // Groceries
  { pattern: /marche adonis|adonis \d|\biga\b|\bmetro\b|\bmaxi\b|super c\b|costco wholesale|h-mart|provigo|marche |fruits de la|fruiterie|epicerie/i, category: "groceries" },

  // Shopping & retail
  { pattern: /dollarama|winners|homesense|marshalls|canadian tire|bureau en gros|best buy|michaels|indigo|wal-mart|walmart|sports experts|swarovski|zara\b|shein/i, category: "shopping" },
  { pattern: /jean coutu|pharmaprix|uniprix/i, category: "shopping" },
  { pattern: /fleuriste|fleur|florist/i, category: "shopping" },
  { pattern: /barbershop|barber\b/i, category: "shopping" },

  // Dining out (broad — checked after the more specific buckets above)
  { pattern: /mcdonald|doner|kabab|shawarma|sushi|pizza|restaurant|bistro|falafel|poke|dumpling|burrito|grill|cuisine|onigiri|ramen|taco|burger|smash burger|chicken|wok|thali|qwelli|uber.*eats|ubereats|pretzel|^chez |wagyu|steak/i, category: "dining_out" },

  // Payroll / regular income
  { pattern: /paie\/payroll|direct deposit|^interest|promotional bonus|giveaway/i, category: "income" },

  // Transfers between people / accounts
  { pattern: /interac e-transfer|transfer (in|out)/i, category: "social_transfers" },
];

function guessCategory(description: string): string {
  for (const { pattern, category } of CATEGORY_KEYWORDS) {
    if (pattern.test(description)) return category;
  }
  return "uncategorized";
}

function stripNoise(text: string) {
  let cleaned = text.replace(/•/g, " ");
  // Wealthsimple's feed runs words together with no space — "MontrealPurchaseChequing"
  // — wherever one label ends and the next begins. Split on a lowercase→uppercase
  // transition first so the noise-word matching below (which needs word boundaries)
  // can actually find "Purchase", "Chequing", "Pending", etc. inside that run.
  cleaned = cleaned.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
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

  // Wealthsimple's activity feed doesn't always show a "+" on incoming
  // money — a deposit or e-Transfer received often just reads "$500.00 CAD"
  // with no sign at all, while every outgoing amount is prefixed with a
  // minus/dash. So the sign is optional here, and its absence means income.
  const amountPattern = /([+\-−–])?\s*\$\s*([\d,]+\.\d{2})/;

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
    const type: ParsedRow["type"] = sign === "+" || !sign ? "INCOME" : "EXPENSE";

    const description = stripNoise(chunk.slice(0, match.index)) || stripNoise(chunk) || "Unknown";

    rows.push({
      date: currentDate.toISOString().slice(0, 10),
      description: description.slice(0, 120),
      amount,
      type,
      pending: pendingFlag || /pending/i.test(chunk),
      rawText: chunk.trim().slice(0, 300),
      // Guess against the raw chunk, not the noise-stripped description —
      // stripping words like "e-transfer" independently can chop up a
      // multi-word phrase ("Interac e-Transfer") before the category
      // matcher gets to see it whole.
      category: guessCategory(chunk),
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
      const description = stripNoise(chunk.slice(0, match.index)).slice(0, 120) || "Unknown";
      rows.push({
        date: today.toISOString().slice(0, 10),
        description,
        amount,
        type: sign === "+" || !sign ? "INCOME" : "EXPENSE",
        pending: /pending/i.test(chunk),
        rawText: chunk.trim().slice(0, 300),
        category: guessCategory(chunk),
      });
    }
  }

  return rows;
}

// Parses the OFFICIAL export CSV from Wealthsimple (Chequing/Activity →
// "Download activities"). This is far more reliable than the copy-paste
// path above — real dates, real signed amounts — but Wealthsimple's export
// doesn't include merchant names for card purchases (activity_sub_type
// "SPEND" just says "Spend"), so those rows come back generically labeled
// and land in "uncategorized" for you to fill in from memory or receipts.
// Columns: effective_date,effective_time,settlement_date,account_id,
// account_type,activity_type,activity_sub_type,description,direction,
// symbol,name,currency,quantity,unit_price,commission,net_cash_amount
const INCOME_SUB_TYPES = new Set(["E_TRFIN", "AFT_IN", "GIVEAWAY", "DIV", "INT"]);
const TRANSFER_SUB_TYPES = new Set(["TRANSFER_TF", "E_TRFOUT", "OBP_OUT", "OBP_IN"]);

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function describeActivity(subType: string, description: string): string {
  const clean = (description || "").trim();
  switch (subType) {
    case "SPEND":
      return "Card purchase";
    case "TRANSFER_TF":
      return "Transfer";
    case "E_TRFOUT":
      return "Interac e-Transfer out";
    case "E_TRFIN":
      return "Interac e-Transfer in";
    case "AFT_IN":
      return "Direct deposit";
    case "OBP_OUT":
      return "Bill payment";
    case "OBP_IN":
      return "Bill payment received";
    case "GIVEAWAY":
      return "Wealthsimple bonus";
    case "INT":
      return "Interest";
    default:
      return clean || subType || "Transaction";
  }
}

export function parseWealthsimpleCSV(raw: string): ParsedRow[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iDate = idx("effective_date");
  const iSubType = idx("activity_sub_type");
  const iDescription = idx("description");
  const iAmount = idx("net_cash_amount");
  const iActivityType = idx("activity_type");

  if (iDate === -1 || iAmount === -1) return []; // not a recognizable Wealthsimple export

  const rows: ParsedRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    const date = (cells[iDate] || "").trim();
    const amountRaw = (cells[iAmount] || "").trim();
    if (!date || !amountRaw) continue;

    const amount = Number(amountRaw.replace(/,/g, ""));
    if (!amount || Number.isNaN(amount)) continue;

    const subType = (cells[iSubType] || "").trim();
    const activityType = (cells[iActivityType] || "").trim();
    const rawDescription = (cells[iDescription] || "").trim();

    const type: ParsedRow["type"] =
      amount > 0 || INCOME_SUB_TYPES.has(subType) || activityType === "Interest" || activityType === "BonusPayment"
        ? "INCOME"
        : "EXPENSE";

    const category = INCOME_SUB_TYPES.has(subType)
      ? "income"
      : TRANSFER_SUB_TYPES.has(subType)
        ? "social_transfers"
        : "uncategorized";

    rows.push({
      date,
      description: describeActivity(subType, rawDescription),
      amount: Math.abs(amount),
      type,
      pending: false,
      rawText: lines[li].slice(0, 300),
      category,
    });
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
