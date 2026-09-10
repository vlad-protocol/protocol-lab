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
    // "select_account" forces Google's account chooser every time, even if
    // the browser only has one session active or already granted consent
    // once — otherwise it silently reuses whatever Google account happens
    // to be signed in, which isn't necessarily the one you want connected.
    // "consent" on top of that guarantees a refresh_token comes back.
    prompt: "select_account consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      // gmail.modify (not just gmail.readonly) is required for anything
      // that changes a message's state — mark read/unread, star, archive,
      // trash. It's a superset of gmail.readonly (still covers listing and
      // reading messages) but stops short of permanently deleting mail.
      "https://www.googleapis.com/auth/gmail.modify",
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

export type GmailInboxMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
};

// Pulls the address out of a "Display Name <addr@x.com>" style header value.
export function extractEmailAddress(headerValue: string): string | null {
  const match = headerValue.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  const trimmed = headerValue.trim();
  return trimmed.includes("@") ? trimmed : null;
}

export type GmailFullMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  messageIdHeader: string;
  references: string;
  html: string | null;
  text: string | null;
  unread: boolean;
};

type GmailPart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailPart[] | null;
};

function decodeBase64Url(data: string) {
  return Buffer.from(data, "base64url").toString("utf-8");
}

// Gmail bodies are a tree of multipart/alternative and multipart/mixed
// parts (plus attachments mixed in) — walk it and grab the first
// text/html and text/plain leaf we find, which is what every mail client
// does for "the" body of a message.
function extractBodies(payload?: GmailPart | null): { html: string | null; text: string | null } {
  let html: string | null = null;
  let text: string | null = null;
  function walk(part?: GmailPart | null) {
    if (!part) return;
    const mime = part.mimeType || "";
    if (mime === "text/html" && part.body?.data && !html) {
      html = decodeBase64Url(part.body.data);
    } else if (mime === "text/plain" && part.body?.data && !text) {
      text = decodeBase64Url(part.body.data);
    }
    part.parts?.forEach(walk);
  }
  walk(payload);
  return { html, text };
}

export async function getGmailMessage(userId: string, id: string): Promise<GmailFullMessage> {
  const client = await getClientForUser(userId);
  const gmail = google.gmail({ version: "v1", auth: client });
  const msg = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const headers = msg.data.payload?.headers || [];
  const header = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
  const { html, text } = extractBodies(msg.data.payload as GmailPart | undefined);

  return {
    id: msg.data.id as string,
    threadId: (msg.data.threadId || "") as string,
    from: header("From"),
    to: header("To"),
    cc: header("Cc"),
    subject: header("Subject"),
    date: header("Date"),
    messageIdHeader: header("Message-ID") || header("Message-Id"),
    references: header("References"),
    html,
    text,
    unread: (msg.data.labelIds || []).includes("UNREAD"),
  };
}

export async function markGmailRead(userId: string, id: string) {
  const client = await getClientForUser(userId);
  const gmail = google.gmail({ version: "v1", auth: client });
  await gmail.users.messages.modify({ userId: "me", id, requestBody: { removeLabelIds: ["UNREAD"] } });
}

function buildRawReply(opts: {
  to: string;
  cc?: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const lines = [
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : null,
    `From: ${opts.from}`,
    `Subject: ${opts.subject}`,
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : null,
    opts.references ? `References: ${opts.references}` : null,
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.body,
  ].filter((l): l is string => l !== null);
  return Buffer.from(lines.join("\n")).toString("base64url");
}

// Like sendGmail, but for replying/forwarding within an existing thread —
// carries the threading headers so Gmail (and the recipient's client)
// groups it with the original conversation instead of starting a new one.
export async function sendGmailReply(
  userId: string,
  opts: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }
) {
  const client = await getClientForUser(userId);
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  const gmail = google.gmail({ version: "v1", auth: client });
  const raw = buildRawReply({ ...opts, from: conn!.email });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: opts.threadId },
  });
  return res.data.id as string;
}

export async function listGmailInbox(userId: string, maxResults = 25): Promise<GmailInboxMessage[]> {
  const client = await getClientForUser(userId);
  const gmail = google.gmail({ version: "v1", auth: client });

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds: ["INBOX"],
  });
  const refs = list.data.messages || [];

  const messages = await Promise.all(
    refs.map(async (ref) => {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: ref.id as string,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      const headers = msg.data.payload?.headers || [];
      const header = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
      return {
        id: msg.data.id as string,
        threadId: (msg.data.threadId || "") as string,
        from: header("From"),
        to: header("To"),
        subject: header("Subject"),
        date: header("Date"),
        snippet: msg.data.snippet || "",
        unread: (msg.data.labelIds || []).includes("UNREAD"),
        starred: (msg.data.labelIds || []).includes("STARRED"),
      };
    })
  );

  return messages;
}

// Applies one label change to many messages in a single Gmail API call —
// what powers "select several, mark read/unread/star/archive/delete" the
// way Gmail's own multi-select toolbar does, instead of one request per
// message.
export async function batchModifyGmailMessages(
  userId: string,
  ids: string[],
  opts: { addLabelIds?: string[]; removeLabelIds?: string[] }
) {
  if (ids.length === 0) return;
  const client = await getClientForUser(userId);
  const gmail = google.gmail({ version: "v1", auth: client });
  await gmail.users.messages.batchModify({
    userId: "me",
    requestBody: {
      ids,
      addLabelIds: opts.addLabelIds,
      removeLabelIds: opts.removeLabelIds,
    },
  });
}
