import * as XLSX from "xlsx";
import { isDateLike, normalizePhoneDisplay } from "@/lib/phone-format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]{7,20}$/;

export type ImportedRow = { name: string | null; email: string | null; phone: string | null };

// Classifies a single free-text token by shape: has "@" and a dot → email,
// looks like a phone number (digits/+/()/-/spaces, at least 7 digits) →
// phone, otherwise → name. Used both for comma-separated pasted lines and
// as a fallback when a spreadsheet's headers don't clearly say what a
// column is.
//
// A plain date (23-07-2026, 07/23/2026) is also all digits/dashes/slashes
// and can have 7+ digits once punctuation is stripped, so it used to
// pass the phone check below — a spreadsheet column of signup dates with
// no recognized header would silently land in the phone field. isDateLike
// rules those out before the phone check ever runs.
export function classify(part: string): { email?: string; phone?: string; name?: string } {
  const trimmed = part.trim();
  if (!trimmed) return {};
  if (EMAIL_RE.test(trimmed)) return { email: trimmed.toLowerCase() };
  if (isDateLike(trimmed)) return {};
  if (PHONE_RE.test(trimmed) && trimmed.replace(/\D/g, "").length >= 7) {
    return { phone: normalizePhoneDisplay(trimmed) };
  }
  return { name: trimmed };
}

const NAME_HEADERS = ["name", "full name", "fullname", "contact", "contact name", "first name", "firstname"];
const EMAIL_HEADERS = ["email", "e-mail", "email address", "e-mail address"];
const PHONE_HEADERS = ["phone", "phone number", "mobile", "cell", "telephone", "tel", "number", "sms"];

function matchHeader(header: string, candidates: string[]) {
  const h = header.trim().toLowerCase();
  return candidates.some((c) => h === c || h.includes(c));
}

// Parses an uploaded CSV or Excel (.xlsx/.xls) file into rows of
// {name, email, phone}. Tries to recognize common header names for each
// field (case-insensitive, a few synonyms each); any column that doesn't
// match a known header — or a file with no header row at all — falls back
// to classifying each cell's value by shape, the same way the bulk-paste
// importer does. Returns the parsed rows plus a count of lines that had
// neither an email nor a phone (skipped).
export function parseContactsFile(buffer: Buffer): { rows: ImportedRow[]; skipped: number } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });

  if (raw.length === 0) return { rows: [], skipped: 0 };

  const headerRow = raw[0].map((c) => String(c ?? ""));
  const nameIdx = headerRow.findIndex((h) => matchHeader(h, NAME_HEADERS));
  const emailIdx = headerRow.findIndex((h) => matchHeader(h, EMAIL_HEADERS));
  const phoneIdx = headerRow.findIndex((h) => matchHeader(h, PHONE_HEADERS));
  const hasRecognizedHeader = nameIdx >= 0 || emailIdx >= 0 || phoneIdx >= 0;

  // If we recognized at least one header, treat row 0 as a header and
  // start data on row 1. Otherwise assume there's no header row (e.g. a
  // bare list of emails/phones with no column titles) and treat every row,
  // including the first, as data — classifying each cell by shape.
  const dataRows = hasRecognizedHeader ? raw.slice(1) : raw;

  const rows: ImportedRow[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const cells = row.map((c) => String(c ?? "").trim()).filter((c) => c.length > 0);
    if (cells.length === 0) continue;

    let name: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    if (hasRecognizedHeader) {
      if (nameIdx >= 0 && row[nameIdx] !== undefined) name = String(row[nameIdx] ?? "").trim() || null;
      if (emailIdx >= 0 && row[emailIdx] !== undefined) email = String(row[emailIdx] ?? "").trim() || null;
      if (phoneIdx >= 0 && row[phoneIdx] !== undefined) {
        const raw = String(row[phoneIdx] ?? "").trim();
        phone = raw ? normalizePhoneDisplay(raw) : null;
      }
      // Any columns we didn't recognize a header for still might contain a
      // usable email/phone/name — classify them as a backfill.
      for (let i = 0; i < row.length; i++) {
        if (i === nameIdx || i === emailIdx || i === phoneIdx) continue;
        const c = classify(String(row[i] ?? ""));
        if (c.email && !email) email = c.email;
        else if (c.phone && !phone) phone = c.phone;
        else if (c.name && !name) name = c.name;
      }
      if (email) email = email.toLowerCase();
    } else {
      for (const cell of cells) {
        const c = classify(cell);
        if (c.email && !email) email = c.email;
        else if (c.phone && !phone) phone = c.phone;
        else if (c.name && !name) name = c.name;
      }
    }

    if (!email && !phone) {
      skipped++;
      continue;
    }
    rows.push({ name, email, phone });
  }

  return { rows, skipped };
}
