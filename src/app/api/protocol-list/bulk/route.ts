import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]{7,20}$/;

function classify(part: string): { email?: string; phone?: string; name?: string } {
  const trimmed = part.trim();
  if (!trimmed) return {};
  if (EMAIL_RE.test(trimmed)) return { email: trimmed.toLowerCase() };
  if (PHONE_RE.test(trimmed) && trimmed.replace(/\D/g, "").length >= 7) return { phone: trimmed };
  return { name: trimmed };
}

// Bulk-adds Protocol List members from pasted text — one person per line.
// Flexible on format: a bare list of emails, a bare list of phone numbers,
// or "name,email,phone" (any field blank/omitted) all work, since each
// comma-separated piece is classified by shape (has "@" → email, looks
// like a phone number → phone, otherwise → name) rather than by position.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Paste at least one line." }, { status: 400 });
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: { name: string | null; email: string | null; phone: string | null; source: "MANUAL"; createdById: string }[] = [];
  let skipped = 0;

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    let email: string | null = null;
    let phone: string | null = null;
    let name: string | null = null;
    for (const part of parts) {
      const c = classify(part);
      if (c.email && !email) email = c.email;
      else if (c.phone && !phone) phone = c.phone;
      else if (c.name && !name) name = c.name;
    }
    if (!email && !phone) {
      skipped++;
      continue;
    }
    rows.push({ name, email, phone, source: "MANUAL", createdById: session.user.id });
  }

  if (rows.length > 0) {
    await prisma.protocolListMember.createMany({ data: rows });
  }

  return NextResponse.json({ added: rows.length, skipped });
}
