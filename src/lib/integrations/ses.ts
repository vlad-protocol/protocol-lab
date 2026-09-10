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
export async function sendSesEmail(to: string, subject: string, html: string) {
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
        },
      },
    },
  });
  const res = await getClient().send(cmd);
  return res.MessageId || null;
}
