// The six content assets the Activation Playbook says a brand will
// actually pay for ("Content and shareability engine"), seeded onto
// every Activation as a trackable checklist so nothing ships late.

export type ContentAssetTemplate = {
  key: string;
  label: string;
  who: string;
  deliveredWithin: string; // human-readable deadline, matches the playbook's table
};

export const CONTENT_ASSET_TEMPLATE: ContentAssetTemplate[] = [
  { key: "reels", label: "3-5 vertical Reels (raw iPhone style)", who: "Vlad + 1 shooter", deliveredWithin: "48h" },
  { key: "hero_recap", label: "1 hero recap video (30-60s, ad-ready)", who: "Shooter", deliveredWithin: "5 days" },
  { key: "edited_photos", label: "30+ edited photos (product, crowd, brand moments)", who: "Photographer", deliveredWithin: "72h" },
  { key: "testimonials", label: "3-5 short testimonials (\"why I came / how I felt\")", who: "Volunteer with a mic", deliveredWithin: "72h" },
  { key: "broll", label: "Raw B-roll folder for the brand's own team", who: "Everyone", deliveredWithin: "72h" },
  { key: "ugc", label: "Creator / attendee UGC, collected and credited", who: "Auto via tag + DM", deliveredWithin: "7 days" },
];

export type ContentAssetRow = ContentAssetTemplate & { done: boolean; link: string };

export function seedContentAssets(): ContentAssetRow[] {
  return CONTENT_ASSET_TEMPLATE.map((a) => ({ ...a, done: false, link: "" }));
}
