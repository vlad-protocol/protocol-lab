import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { queueEmailCampaign } from "@/lib/campaigns";
import { isSesConfigured } from "@/lib/integrations/ses";

// Snapshots the audience into EmailSend rows and flips the campaign to
// SENDING (or SCHEDULED, if scheduledAt is set in the future). Actual
// sending happens in batches on the background tick — see
// src/lib/campaigns.ts and src/instrumentation.ts.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSesConfigured()) {
    return NextResponse.json(
      { error: "Amazon SES isn't configured yet — add AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_EMAIL in Railway first." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const existing = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "This campaign has already been queued." }, { status: 400 });
  }

  const count = await queueEmailCampaign(id);
  return NextResponse.json({ ok: true, queued: count });
}
