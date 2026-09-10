import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { previewEmailAudience, previewSmsAudience, type AudienceFilter } from "@/lib/campaigns";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel, filter } = (await req.json()) as { channel?: "email" | "sms"; filter?: AudienceFilter };
  const result =
    channel === "sms" ? await previewSmsAudience(filter) : await previewEmailAudience(filter);

  return NextResponse.json(result);
}
