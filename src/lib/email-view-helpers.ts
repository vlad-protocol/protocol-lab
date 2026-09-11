// Shared by the two "view one email, reply/forward" modals (the Mail
// inbox's MessageDetail and the lead page's EmailInteractionModal) so
// they render a message the same Gmail-like way in both places instead
// of drifting apart.

export function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return headerValue.trim();
}

// Splits a "Display Name <email@x.com>" header into its parts, falling
// back to the bare address (or address-derived name) when there's no
// display name — e.g. plain "someone@x.com".
export function parseAddress(headerValue: string): { name: string; email: string } {
  const value = headerValue.trim();
  const match = value.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return { name: name || email, email };
  }
  return { name: value, email: value };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A small fixed palette (not random) so the same sender always gets the
// same color across renders/pages — a cheap hash of the name/email.
const AVATAR_PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-fuchsia-500",
  "bg-orange-500",
];

export function avatarColorClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function subjectWithPrefix(subject: string, prefix: string): string {
  return subject.toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;
}

// Gmail's own relative-ish format: time for today, "Mon, 5:30 PM" for
// this week, otherwise a short date — much easier to scan in a list of
// messages than a full localized timestamp every time.
export function formatMessageDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const daysAgo = Math.round((now.getTime() - d.getTime()) / 86_400_000);
  if (daysAgo >= 0 && daysAgo < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
