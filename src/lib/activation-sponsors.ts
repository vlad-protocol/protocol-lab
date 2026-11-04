// SOP Section 05: one sponsor per category per event, and the main
// client's own category is automatically exclusive (no competing brand
// in that category may sponsor or attend as a vendor). No alcohol
// sponsors, ever, regardless of category.

const ALCOHOL_PATTERN = /\balcohol|beer|wine|spirits?|cocktail/i;

export function checkSponsorSlot(opts: {
  category: string;
  mainSponsorCategory: string | null;
  existingCategories: string[]; // categories already confirmed on this activation (excluding the slot being edited)
}): { ok: boolean; reason?: string } {
  const category = opts.category.trim();
  if (!category) return { ok: false, reason: "Category is required." };

  if (ALCOHOL_PATTERN.test(category)) {
    return { ok: false, reason: "No alcohol brands sponsor any Protocol event — this is a hard rule, not a judgment call." };
  }

  if (opts.mainSponsorCategory && sameCategory(category, opts.mainSponsorCategory)) {
    return { ok: false, reason: `"${category}" matches the main brand's own category (${opts.mainSponsorCategory}), which is automatically exclusive to them.` };
  }

  const dupe = opts.existingCategories.find((c) => sameCategory(c, category));
  if (dupe) {
    return { ok: false, reason: `"${dupe}" is already filled for this event — only one sponsor per category.` };
  }

  return { ok: true };
}

function sameCategory(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
