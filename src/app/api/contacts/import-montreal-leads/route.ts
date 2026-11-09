import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import leadsData from "@/data/imports/protocol-100-leads-montreal.json";

const SOURCE_TAG = "Protocol 100 Leads Montreal (2026-11-09)";

type RawLead = {
  num: number;
  studio: string;
  category: string | null;
  area: string | null;
  founder: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  priority: "HOT" | "WARM" | "COLD" | null;
  notes: string | null;
};

// One-time (but safely re-runnable) import of the Montreal sponsorship
// prospect list Vlad put together — 100 fitness/wellness studios as
// potential event sponsors/partners. Dedupes by email first, then by
// company name, so re-running this (or importing an updated version of
// the same sheet later) never creates duplicate Contact rows — it just
// skips anything already in the CRM.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = leadsData as RawLead[];
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      const email = lead.email?.trim().toLowerCase() || null;
      const existing = email
        ? await prisma.contact.findFirst({ where: { email } })
        : await prisma.contact.findFirst({ where: { companyName: { equals: lead.studio, mode: "insensitive" } } });
      if (existing) {
        skipped++;
        continue;
      }

      const noteParts = [lead.area ? `Area: ${lead.area}` : null, lead.notes || null].filter(Boolean);

      await prisma.contact.create({
        data: {
          companyName: lead.studio,
          // Most rows have no named founder yet — fall back to the
          // studio name itself, same convention as the regular
          // "Add lead" flow (contactName is required on the model).
          contactName: lead.founder?.trim() || lead.studio,
          title: lead.title?.trim() || null,
          email,
          phone: lead.phone?.trim() || null,
          website: lead.website?.trim() || null,
          industry: lead.category?.trim() || null,
          type: "SPONSOR",
          status: "NEW_LEAD",
          priority: lead.priority || null,
          source: SOURCE_TAG,
          notes: noteParts.length ? noteParts.join(" — ") : null,
          createdById: session.user.id,
        },
      });
      created++;
    } catch (err) {
      errors.push(`${lead.studio}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  return NextResponse.json({ created, skipped, errors });
}

// Reports how many of this list are already in the CRM, so the button
// can show "Already imported" instead of re-running pointlessly.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const total = (leadsData as RawLead[]).length;
  const alreadyImported = await prisma.contact.count({ where: { source: SOURCE_TAG } });
  return NextResponse.json({ total, alreadyImported });
}
