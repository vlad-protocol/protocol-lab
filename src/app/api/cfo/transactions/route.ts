import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { dedupKey } from "@/lib/cfo-dedup";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    dateFilter = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const transactions = await prisma.cFOTransaction.findMany({
    where: { userId: session.user.id, ...(dateFilter ? { date: dateFilter } : {}) },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ transactions });
}

// Bulk-saves the reviewed rows from the parse step. Each row that has
// `rememberRule: true` also creates/updates a merchant rule so future pastes
// of the same merchant auto-categorize.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { rows } = body as {
    rows?: {
      date: string;
      description: string;
      amount: number;
      type: "INCOME" | "EXPENSE";
      category: string;
      pending?: boolean;
      rawText?: string;
      rememberRule?: boolean;
      matchText?: string;
    }[];
  };
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "No rows to save." }, { status: 400 });
  }

  // Skip rows that already exist (same date, amount, type, and source
  // text — see cfo-dedup.ts) so re-importing the same CSV or paste twice
  // doesn't double-count anything. Also de-dupes within this batch, in
  // case the same line appears twice in one paste/upload.
  const dates = rows.map((r) => new Date(r.date).getTime()).filter((t) => !Number.isNaN(t));
  const existing = dates.length
    ? await prisma.cFOTransaction.findMany({
        where: {
          userId: session.user.id,
          date: { gte: new Date(Math.min(...dates)), lte: new Date(Math.max(...dates)) },
        },
        select: { date: true, amount: true, type: true, rawText: true, description: true },
      })
    : [];
  const existingKeys = new Set(existing.map((t) => dedupKey(t)));

  const uniqueRows: typeof rows = [];
  const skippedRows: typeof rows = [];
  const seenInBatch = new Set<string>();
  for (const r of rows) {
    const key = dedupKey({ date: new Date(r.date), amount: r.amount, type: r.type, rawText: r.rawText, description: r.description });
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      skippedRows.push(r);
      continue;
    }
    seenInBatch.add(key);
    uniqueRows.push(r);
  }

  const created = uniqueRows.length
    ? await prisma.$transaction(
        uniqueRows.map((r) =>
          prisma.cFOTransaction.create({
            data: {
              userId: session.user.id,
              date: new Date(r.date),
              description: r.description,
              amount: r.amount,
              type: r.type,
              category: r.category || "uncategorized",
              pending: !!r.pending,
              rawText: r.rawText || null,
            },
          })
        )
      )
    : [];

  for (const r of rows) {
    if (r.rememberRule && r.matchText && r.category) {
      await prisma.cFOMerchantRule.upsert({
        where: { userId_matchText: { userId: session.user.id, matchText: r.matchText.toLowerCase() } },
        update: { category: r.category },
        create: {
          userId: session.user.id,
          matchText: r.matchText.toLowerCase(),
          category: r.category,
          type: r.type,
        },
      });
    }
  }

  return NextResponse.json({
    transactions: created,
    skipped: skippedRows.length,
    skippedRows: skippedRows.map((r) => ({ date: r.date, description: r.description, amount: r.amount })),
  });
}
