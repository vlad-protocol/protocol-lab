import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { dedupKey } from "@/lib/cfo-dedup";

// Finds groups of already-saved transactions that look like the same
// transaction imported more than once (same date, amount, type, and
// source text — see cfo-dedup.ts). Read-only: returns the groups for
// review. DELETE actually removes the extras.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await prisma.cFOTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof all>();
  for (const t of all) {
    const key = dedupKey(t);
    const list = groups.get(key) || [];
    list.push(t);
    groups.set(key, list);
  }

  const duplicateGroups = [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      count: list.length,
      // The first (earliest created) is the one that would be kept.
      keep: list[0],
      extras: list.slice(1),
    }));

  const extraCount = duplicateGroups.reduce((sum, g) => sum + g.extras.length, 0);

  return NextResponse.json({
    totalTransactions: all.length,
    duplicateGroups,
    extraCount,
  });
}

// Deletes the extras in every duplicate group, keeping the earliest
// (by createdAt) transaction in each group. Idempotent — running it
// again with nothing left to dedupe just deletes 0 rows.
export async function DELETE() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await prisma.cFOTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof all>();
  for (const t of all) {
    const key = dedupKey(t);
    const list = groups.get(key) || [];
    list.push(t);
    groups.set(key, list);
  }

  const idsToDelete: string[] = [];
  for (const list of groups.values()) {
    if (list.length > 1) {
      for (const extra of list.slice(1)) idsToDelete.push(extra.id);
    }
  }

  if (idsToDelete.length > 0) {
    await prisma.cFOTransaction.deleteMany({ where: { id: { in: idsToDelete } } });
  }

  return NextResponse.json({ removed: idsToDelete.length });
}
