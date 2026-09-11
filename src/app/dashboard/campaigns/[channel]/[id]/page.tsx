import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { CampaignDetail } from "./campaign-detail";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ channel: string; id: string }>;
}) {
  await requireAccess("campaigns");
  const { channel, id } = await params;

  if (channel === "email") {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: { sends: { orderBy: { createdAt: "asc" } } },
    });
    if (!campaign) notFound();
    return (
      <div className="max-w-5xl">
        <CampaignDetail channel="email" campaign={JSON.parse(JSON.stringify(campaign))} />
      </div>
    );
  }

  if (channel === "sms") {
    const campaign = await prisma.smsCampaign.findUnique({
      where: { id },
      include: { sends: { orderBy: { createdAt: "asc" } } },
    });
    if (!campaign) notFound();
    return (
      <div className="max-w-5xl">
        <CampaignDetail channel="sms" campaign={JSON.parse(JSON.stringify(campaign))} />
      </div>
    );
  }

  notFound();
}
