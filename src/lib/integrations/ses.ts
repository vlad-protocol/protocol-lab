import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// Amazon SES is configured entirely via environment variables (set once in
// Railway), the same pattern used for ANTHROPIC_API_KEY — unlike
// Gmail/Twilio there's no per-user "connect" flow, since campaigns send
// from one shared sending identity for the whole account.
//
// Heads up: a brand-new SES account starts in the "sandbox" — it can only
// send to addresses you've individually verified, and at a low rate. You
// need to request production access from AWS support before real bulk
// sending works. See the README for the exact steps.

export function isSesConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.SES_FROM_EMAIL
  );
}

let client: SESv2Client | null = null;

function getClient() {
  if (client) return client;
  client = new SESv2Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

function fromHeader() {
  const email = process.env.SES_FROM_EMAIL!;
  const name = process.env.SES_FROM_NAME;
  return name ? `${name} <${email}>` : email;
}

// Sends one email and returns the SES message id. Throws on failure (e.g.
// still-sandboxed account emailing an unverified address, rate exceeded,
// suppressed recipient) — callers record the error against that one send
// rather than letting it kill the whole batch.
//
// Always sends a plain-text part alongside the HTML. This isn't
// cosmetic: an HTML-only email is itself a mild spam/promotions signal
// to mail providers, and a text/plain alternative is what a real,
// personally-written email always has. It won't override Gmail's tab
// classifier on its own (nothing server-side can — that call is Gmail's
// and is influenced by content style and recipient behavior), but it's
// one of the few things actually within our control here.
export async function sendSesEmail(to: string, subject: string, html: string, text?: string) {
  if (!isSesConfigured()) {
    throw new Error("Amazon SES isn't configured yet — add AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_EMAIL in Railway.");
  }
  const cmd = new SendEmailCommand({
    FromEmailAddress: fromHeader(),
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text && text.trim() ? text : htmlToPlainText(html), Charset: "UTF-8" },
        },
      },
    },
  });
  const res = await getClient().send(cmd);
  return res.MessageId || null;
}

// Very small HTML→text fallback for when no dedicated plain-text
// version was built (e.g. a legacy plain-body campaign that happens to
// contain HTML) — just enough to give SES a non-empty, readable text
// part rather than sending literal markup.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
