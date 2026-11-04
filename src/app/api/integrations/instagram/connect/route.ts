import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { getInstagramAuthUrl, isInstagramConfigured } from "@/lib/integrations/instagram";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isInstagramConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/settings?instagram=not-configured", req.url));
  }

  const url = getInstagramAuthUrl(session.user.id);
  return NextResponse.redirect(url);
}
