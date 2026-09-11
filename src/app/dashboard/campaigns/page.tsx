import { Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { CampaignsShell } from "./campaigns-shell";
import { isSesConfigured } from "@/lib/integrations/ses";
import { getTwilioConfig } from "@/lib/integrations/twilio";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  await requireAccess("campaigns");

  const [emailCampaigns, smsCampaigns, sesReady, twilioConfig] = await Promise.all([
    prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.smsCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    Promise.resolve(isSesConfigured()),
    getTwilioConfig(),
  ]);

  const emailWithCounts = await Promise.all(
    emailCampaigns.map(async (c) => {
      const [grouped, openedCount, clickedCount] = await Promise.all([
        prisma.emailSend.groupBy({ by: ["status"], where: { campaignId: c.id }, _count: true }),
        prisma.emailSend.count({ where: { campaignId: c.id, openedAt: { not: null } } }),
        prisma.emailSend.count({ where: { campaignId: c.id, clickCount: { gt: 0 } } }),
      ]);
      const counts: Record<string, number> = {};
      for (const g of grouped) counts[g.status] = g._count;
      return { ...c, sendCounts: counts, openedCount, clickedCount };
    })
  );

  const smsWithCounts = await Promise.all(
    smsCampaigns.map(async (c) => {
      const grouped = await prisma.smsSend.groupBy({ by: ["status"], where: { campaignId: c.id }, _count: true });
      const counts: Record<string, number> = {};
      for (const g of grouped) counts[g.status] = g._count;
      return { ...c, sendCounts: counts };
    })
  );

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Radio className="h-6 w-6 text-[var(--hq-accent)]" />
          Campaigns
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Mass email blasts (via Amazon SES) and mass SMS blasts (via Twilio) to any slice of your
          Protocol CRM — no saved lists, just pick a filter and go. Unsubscribes and bounces are
          tracked automatically so you never message someone who's opted out.
        </p>
      </div>

      <div className="mt-6">
        <CampaignsShell
          initialEmailCampaigns={JSON.parse(JSON.stringify(emailWithCounts))}
          initialSmsCampaigns={JSON.parse(JSON.stringify(smsWithCounts))}
          sesReady={sesReady}
          twilioReady={!!twilioConfig}
        />
      </div>
    </div>
  );
}
