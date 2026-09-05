import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

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

  const created = await prisma.$transaction(
    rows.map((r) =>
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
  );

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

  return NextResponse.json({ transactions: created });
}
