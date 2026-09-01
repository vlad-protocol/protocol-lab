import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { getGmailAuthUrl, isGmailConfigured } from "@/lib/integrations/gmail";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gmail isn't configured on this deployment yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI — see Settings for instructions.",
      },
      { status: 400 }
    );
  }

  const url = getGmailAuthUrl(session.user.id);
  return NextResponse.redirect(url);
}
