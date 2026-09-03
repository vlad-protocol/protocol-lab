import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { AdsView } from "./ads-view";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  await requireAccess("ads");

  const [campaigns, contacts] = await Promise.all([
    prisma.adCampaign.findMany({
      include: { client: { select: { id: true, companyName: true, contactName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Megaphone className="h-6 w-6 text-[var(--hq-accent)]" />
          Ads
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          What's running per client and platform, budget vs. spend, and how
          it's doing. Manual ledger for now — a live Meta Ads pull (spend and
          results synced automatically) is the natural next step once an ad
          account and API keys are connected.
        </p>
      </div>

      <div className="mt-6">
        <AdsView
          initialCampaigns={campaigns.map((c) => ({
            ...c,
            startDate: c.startDate ? c.startDate.toISOString() : null,
            endDate: c.endDate ? c.endDate.toISOString() : null,
            createdAt: c.createdAt.toISOString(),
          }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
