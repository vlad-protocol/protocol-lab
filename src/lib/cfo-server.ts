import { prisma } from "@/lib/prisma";
import { DEFAULT_CFO_CATEGORIES } from "@/lib/cfo-defaults";

// Shared by the categories API route and the CFO page's server component so
// a brand-new user gets a sensible starter category list the first time
// they open either path, without seeding it twice.
export async function getOrSeedCategories(userId: string) {
  let categories = await prisma.cFOBudgetCategory.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });
  if (categories.length === 0) {
    await prisma.cFOBudgetCategory.createMany({
      data: DEFAULT_CFO_CATEGORIES.map((c, i) => ({ userId, key: c.key, label: c.label, order: i })),
    });
    categories = await prisma.cFOBudgetCategory.findMany({ where: { userId }, orderBy: { order: "asc" } });
  }
  return categories;
}
