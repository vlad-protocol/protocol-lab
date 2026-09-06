import { prisma } from "@/lib/prisma";
import { DEFAULT_CFO_CATEGORIES, CATEGORY_MERGE_MAP } from "@/lib/cfo-defaults";

// Shared by the categories API route and the CFO page's server component so
// a brand-new user gets a sensible starter category list the first time
// they open either path, without seeding it twice. Also runs the one-time
// 15→8 category simplification for accounts created before that change —
// no button, no manual step, it just fixes itself on next load.
export async function getOrSeedCategories(userId: string) {
  let categories = await prisma.cFOBudgetCategory.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });

  if (categories.length === 0) {
    await prisma.cFOBudgetCategory.createMany({
      data: DEFAULT_CFO_CATEGORIES.map((c, i) => ({ userId, key: c.key, label: c.label, order: i })),
    });
    return prisma.cFOBudgetCategory.findMany({ where: { userId }, orderBy: { order: "asc" } });
  }

  const legacyKeys = categories.map((c) => c.key).filter((key) => key in CATEGORY_MERGE_MAP);
  if (legacyKeys.length > 0) {
    await simplifyCategories(userId, categories);
    categories = await prisma.cFOBudgetCategory.findMany({ where: { userId }, orderBy: { order: "asc" } });
  }

  return categories;
}

// Consolidates a user's existing (legacy, fine-grained) categories down to
// the 8 canonical ones in CATEGORY_MERGE_MAP, reassigning every transaction,
// merchant rule, and recurring bill that referenced a merged-away key, and
// folding any budget already set on the old category into the new one so
// nothing is silently lost.
async function simplifyCategories(
  userId: string,
  existing: { id: string; key: string; label: string; monthlyBudget: number }[]
) {
  const byKey = new Map(existing.map((c) => [c.key, c]));

  // Figure out the final budget for each canonical key: its own existing
  // budget (if the user already had that exact key) plus whatever was set
  // on any legacy category merging into it.
  const canonicalBudget = new Map<string, number>();
  for (const def of DEFAULT_CFO_CATEGORIES) {
    canonicalBudget.set(def.key, byKey.get(def.key)?.monthlyBudget ?? 0);
  }
  for (const [legacyKey, canonicalKey] of Object.entries(CATEGORY_MERGE_MAP)) {
    const legacy = byKey.get(legacyKey);
    if (legacy && legacy.monthlyBudget > 0) {
      canonicalBudget.set(canonicalKey, (canonicalBudget.get(canonicalKey) || 0) + legacy.monthlyBudget);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Ensure every canonical category exists.
    for (let i = 0; i < DEFAULT_CFO_CATEGORIES.length; i++) {
      const def = DEFAULT_CFO_CATEGORIES[i];
      const current = byKey.get(def.key);
      if (current) {
        await tx.cFOBudgetCategory.update({
          where: { id: current.id },
          data: { order: i, monthlyBudget: canonicalBudget.get(def.key) ?? current.monthlyBudget },
        });
      } else {
        await tx.cFOBudgetCategory.create({
          data: {
            userId,
            key: def.key,
            label: def.label,
            order: i,
            monthlyBudget: canonicalBudget.get(def.key) ?? 0,
          },
        });
      }
    }

    // Reassign every record that referenced a merged-away key, then delete
    // the now-empty legacy category rows.
    for (const [legacyKey, canonicalKey] of Object.entries(CATEGORY_MERGE_MAP)) {
      const legacy = byKey.get(legacyKey);
      if (!legacy) continue;
      await tx.cFOTransaction.updateMany({
        where: { userId, category: legacyKey },
        data: { category: canonicalKey },
      });
      await tx.cFOMerchantRule.updateMany({
        where: { userId, category: legacyKey },
        data: { category: canonicalKey },
      });
      await tx.cFORecurringBill.updateMany({
        where: { userId, category: legacyKey },
        data: { category: canonicalKey },
      });
      await tx.cFOBudgetCategory.delete({ where: { id: legacy.id } });
    }
  });
}
