import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exchangeInstagramCode } from "@/lib/integrations/instagram";
import { encryptSecret } from "@/lib/crypto";

// One shared Instagram connection for the whole account (like Twilio) —
// state just has to match whoever started the flow, it doesn't scope the
// connection to that user.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || state !== session.user.id) {
    return NextResponse.redirect(new URL("/dashboard/settings?instagram=error", req.url));
  }

  try {
    const { igUserId, username, accessToken, expiresAt } = await exchangeInstagramCode(code);
    await prisma.instagramConnection.deleteMany({});
    await prisma.instagramConnection.create({
      data: {
        igUserId,
        username,
        accessToken: encryptSecret(accessToken),
        tokenExpiresAt: expiresAt,
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/dashboard/settings?instagram=error", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard/settings?instagram=connected", req.url));
}
