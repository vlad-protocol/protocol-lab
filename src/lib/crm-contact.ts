import { prisma } from "@/lib/prisma";

// A lead can have more than one email address attached to it: its own
// primary Contact.email, plus any number of additional stakeholders
// recorded as ContactPerson rows (an assistant, a finance contact, a
// second decision-maker). Every place that resolves "which lead does
// this email address belong to" — the Gmail history backfill, the live
// inbox sync, reply/forward auto-logging — goes through these helpers
// so all of them stay in sync on that lookup instead of each hand-rolling
// its own Contact.email-only query.

type ContactSummary = { id: string; contactName: string; companyName: string | null };

// Bulk lookup: for each email in `emails`, which lead (if any) it belongs
// to, covering both Contact.email and every ContactPerson.email. Returns
// a map keyed by lowercased email.
export async function findContactSummariesByEmails(
  emails: string[]
): Promise<Map<string, ContactSummary>> {
  const map = new Map<string, ContactSummary>();
  if (emails.length === 0) return map;

  const [direct, viaPeople] = await Promise.all([
    prisma.contact.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: { id: true, contactName: true, companyName: true, email: true },
    }),
    prisma.contactPerson.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: {
        email: true,
        contact: { select: { id: true, contactName: true, companyName: true } },
      },
    }),
  ]);

  for (const c of direct) {
    if (c.email) map.set(c.email.toLowerCase(), { id: c.id, contactName: c.contactName, companyName: c.companyName });
  }
  // ContactPerson rows are checked second so a primary Contact.email match
  // always wins if, unusually, the same address appears in both places.
  for (const p of viaPeople) {
    if (p.email && !map.has(p.email.toLowerCase())) map.set(p.email.toLowerCase(), p.contact);
  }
  return map;
}

export async function findContactSummaryByEmail(email: string): Promise<ContactSummary | null> {
  const map = await findContactSummariesByEmails([email]);
  return map.get(email.toLowerCase()) ?? null;
}

// Same idea as findContactSummariesByEmails, but returning bare contact
// ids — what the history backfill needs when it's just linking messages,
// not displaying anything.
export async function mapEmailsToContactIds(emails: string[]): Promise<Map<string, string>> {
  const summaries = await findContactSummariesByEmails(emails);
  const map = new Map<string, string>();
  for (const [email, c] of summaries) map.set(email, c.id);
  return map;
}

// Shared by every "send an email that should show up in the CRM" path
// (general compose, reply, forward) — finds the contact this address
// already belongs to (as their primary email or one of their recorded
// people's emails), or creates a new lead so the send/reply still gets
// logged against someone.
export async function findOrCreateContactByEmail(email: string, createdById: string) {
  const existing = await findContactSummaryByEmail(email);
  if (existing) return existing.id;

  const created = await prisma.contact.create({
    data: {
      contactName: email.split("@")[0],
      email,
      createdById,
    },
  });
  return created.id;
}
