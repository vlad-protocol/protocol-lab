import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { getGmailAuthUrl, isGmailConfigured } from "@/lib/integrations/gmail";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGmailConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/mail?gmail=not-configured", req.url));
  }

  const url = getGmailAuthUrl(session.user.id);
  return NextResponse.redirect(url);
}
