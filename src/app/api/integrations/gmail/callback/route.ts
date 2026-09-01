import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exchangeGmailCode } from "@/lib/integrations/gmail";
import { encryptSecret } from "@/lib/crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // state carries the id of the user who started the flow — if it doesn't
  // match whoever is logged in now, bail rather than attach the wrong
  // account's Gmail to this session.
  if (!code || state !== session.user.id) {
    return NextResponse.redirect(new URL("/dashboard/settings?gmail=error", req.url));
  }

  try {
    const { email, accessToken, refreshToken, expiresAt } = await exchangeGmailCode(code);
    if (!refreshToken) {
      // Google only returns a refresh token on the first consent; if the
      // user had connected before and revoked, they need to fully
      // disconnect (in Google Account settings) before reconnecting.
      return NextResponse.redirect(new URL("/dashboard/settings?gmail=no-refresh-token", req.url));
    }
    await prisma.gmailConnection.upsert({
      where: { userId: session.user.id },
      update: {
        email,
        accessToken: encryptSecret(accessToken),
        refreshToken: encryptSecret(refreshToken),
        expiresAt,
      },
      create: {
        userId: session.user.id,
        email,
        accessToken: encryptSecret(accessToken),
        refreshToken: encryptSecret(refreshToken),
        expiresAt,
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/dashboard/settings?gmail=error", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard/settings?gmail=connected", req.url));
}
