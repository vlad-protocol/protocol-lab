import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Each rep connects their own Gmail account (via OAuth) so mail sent from
// the HQ actually comes from them, not a shared inbox — matching "I want
// to see clearly the email that was sent" per rep.

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Gmail isn't configured yet. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function isGmailConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function getGmailAuthUrl(state: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

export async function exchangeGmailCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return {
    email: data.email as string,
    accessToken: tokens.access_token as string,
    refreshToken: tokens.refresh_token as string,
    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600_000),
  };
}

async function getClientForUser(userId: string) {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("This user hasn't connected Gmail yet.");

  const client = getOAuthClient();
  client.setCredentials({
    access_token: decryptSecret(conn.accessToken),
    refresh_token: decryptSecret(conn.refreshToken),
    expiry_date: conn.expiresAt.getTime(),
  });

  // Refresh + persist if the access token is stale.
  if (conn.expiresAt.getTime() < Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.gmailConnection.update({
      where: { userId },
      data: {
        accessToken: encryptSecret(credentials.access_token as string),
        expiresAt: new Date(credentials.expiry_date || Date.now() + 3600_000),
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

function buildRawMessage(to: string, from: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");
  return Buffer.from(message).toString("base64url");
}

export async function sendGmail(userId: string, to: string, subject: string, body: string) {
  const client = await getClientForUser(userId);
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  const gmail = google.gmail({ version: "v1", auth: client });
  const raw = buildRawMessage(to, conn!.email, subject, body);
  const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  return res.data.id as string;
}
