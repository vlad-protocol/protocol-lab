import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { listZeffyCampaigns } from "@/lib/integrations/zeffy";

// Backs the "link to a Zeffy campaign" picker on the event form — lets
// you choose from real campaigns instead of typing an id blind.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const campaigns = await listZeffyCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load Zeffy campaigns." }, { status: 502 });
  }
}
