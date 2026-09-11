// Shared by the Protocol List importer and its one-time cleanup route.
//
// The importer's old "looks like a phone number" check (digits, +, (), -,
// ., spaces) also matched plain dates written as 23-07-2026 or
// 07/23/2026 — a spreadsheet column of signup dates with no recognized
// header got backfilled straight into the phone field. isDateLike() is
// the guard that should have been there from the start; normalizePhoneDisplay()
// reformats a real phone number into one consistent, clean shape instead
// of keeping whatever punctuation the source file happened to use.

const DATE_LIKE_RE = /^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/;

export function isDateLike(value: string): boolean {
  const trimmed = value.trim();
  if (!DATE_LIKE_RE.test(trimmed)) return false;
  // A real date has a 4-digit year somewhere in it; a phone number
  // formatted with dashes in 3 groups (e.g. 514-555-0100) never matches
  // the pattern above anyway since its middle group is 3 digits, not
  // 1-2 — this check is just extra insurance against a short-form date.
  return /\d{4}/.test(trimmed);
}

// Strips everything but digits and a leading "+", then lays the digits
// out in a standard, readable shape. Anything that doesn't cleanly fit
// North American 10/11-digit shape is left as plain digits (with the
// leading "+" kept if the source had one) rather than guessed at.
export function normalizePhoneDisplay(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return hasPlus ? `+${digits}` : digits;
}
