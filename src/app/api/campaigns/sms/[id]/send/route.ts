import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { queueSmsCampaign } from "@/lib/campaigns";
import { getTwilioConfig } from "@/lib/integrations/twilio";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twilioConfig = await getTwilioConfig();
  if (!twilioConfig) {
    return NextResponse.json({ error: "Twilio isn't connected yet — add it in Settings first." }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.smsCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "This campaign has already been queued." }, { status: 400 });
  }

  const count = await queueSmsCampaign(id);
  return NextResponse.json({ ok: true, queued: count });
}
