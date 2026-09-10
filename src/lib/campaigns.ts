import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/integrations/ses";
import { sendSms } from "@/lib/integrations/twilio";
import type { Prisma } from "@prisma/client";

// --- Shared audience filter -------------------------------------------
//
// Mass campaigns target the live CRM ad hoc — no saved "segment" model.
// The filter shape matches the CRM's own list filters so it feels
// familiar: pick some types/statuses and/or a free-text search.

export type AudienceFilter = {
  types?: string[]; // ContactType values; empty/omitted = all
  statuses?: string[]; // LeadStatus values; empty/omitted = all
};

function audienceWhere(filter: AudienceFilter | null | undefined) {
  const where: Prisma.ContactWhereInput = {};
  if (filter?.types && filter.types.length > 0) {
    where.type = { in: filter.types as never[] };
  }
  if (filter?.statuses && filter.statuses.length > 0) {
    where.status = { in: filter.statuses as never[] };
  }
  return where;
}

export async function previewEmailAudience(filter: AudienceFilter | null | undefined) {
  const [matching, suppressions] = await Promise.all([
    prisma.contact.findMany({
      where: { ...audienceWhere(filter), email: { not: null } },
      select: { email: true },
    }),
    prisma.emailSuppression.findMany({ select: { email: true } }),
  ]);
  const suppressed = new Set(suppressions.map((s) => s.email.toLowerCase()));
  const seen = new Set<string>();
  let count = 0;
  for (const c of matching) {
    const email = (c.email || "").toLowerCase().trim();
    if (!email || seen.has(email) || suppressed.has(email)) continue;
    seen.add(email);
    count++;
  }
  return { count, suppressedCount: suppressed.size };
}

export async function previewSmsAudience(filter: AudienceFilter | null | undefined) {
  const [matching, suppressions] = await Promise.all([
    prisma.contact.findMany({
      where: { ...audienceWhere(filter), phone: { not: null } },
      select: { phone: true },
    }),
    prisma.smsSuppression.findMany({ select: { phone: true } }),
  ]);
  const suppressed = new Set(suppressions.map((s) => s.phone));
  const seen = new Set<string>();
  let count = 0;
  for (const c of matching) {
    const phone = (c.phone || "").trim();
    if (!phone || seen.has(phone) || suppressed.has(phone)) continue;
    seen.add(phone);
    count++;
  }
  return { count, suppressedCount: suppressed.size };
}

function fillTemplate(text: string, contact: { contactName: string; companyName: string | null }) {
  return text
    .replaceAll("{{contactName}}", contact.contactName)
    .replaceAll("{{companyName}}", contact.companyName || "");
}

// --- Unsubscribe tokens --------------------------------------------------
//
// No per-send token stored in the DB — the link is a stateless signed
// token (email + HMAC using AUTH_SECRET), so it works even though a send
// row's contact might later be edited or deleted. /unsubscribe/[token]
// verifies the signature, then writes the EmailSuppression row.

function unsubscribeKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return crypto.createHash("sha256").update(`unsub:${secret}`).digest();
}

export function signUnsubscribeToken(email: string) {
  const payload = Buffer.from(email.toLowerCase().trim(), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", unsubscribeKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", unsubscribeKey()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function unsubscribeFooterHtml(baseUrl: string, email: string) {
  const url = `${baseUrl}/unsubscribe/${signUnsubscribeToken(email)}`;
  return `<p style="margin-top:24px;font-size:11px;color:#999;">Don't want these emails? <a href="${url}" style="color:#999;">Unsubscribe</a>.</p>`;
}

// --- Sending a campaign (snapshot + queue) -------------------------------
//
// "Send now"/"Schedule" both call this: it snapshots the audience into
// *Send rows right away (so the record of who it went to is frozen), then
// flips the campaign to SENDING (or leaves it SCHEDULED if scheduledAt is
// in the future). The background tick drains PENDING sends in batches.

export async function queueEmailCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found.");
  const filter = (campaign.audienceFilter as AudienceFilter | null) || null;

  const [contacts, suppressions] = await Promise.all([
    prisma.contact.findMany({ where: { ...audienceWhere(filter), email: { not: null } } }),
    prisma.emailSuppression.findMany({ select: { email: true } }),
  ]);
  const suppressed = new Set(suppressions.map((s) => s.email.toLowerCase()));
  const seen = new Set<string>();

  const rows: Prisma.EmailSendCreateManyInput[] = [];
  for (const c of contacts) {
    const email = (c.email || "").toLowerCase().trim();
    if (!email || seen.has(email) || suppressed.has(email)) continue;
    seen.add(email);
    rows.push({ campaignId, contactId: c.id, toEmail: c.email!, toName: c.contactName });
  }

  await prisma.$transaction([
    prisma.emailSend.createMany({ data: rows, skipDuplicates: true }),
    prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: campaign.scheduledAt && campaign.scheduledAt > new Date() ? "SCHEDULED" : "SENDING" },
    }),
  ]);
  return rows.length;
}

export async function queueSmsCampaign(campaignId: string) {
  const campaign = await prisma.smsCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found.");
  const filter = (campaign.audienceFilter as AudienceFilter | null) || null;

  const [contacts, suppressions] = await Promise.all([
    prisma.contact.findMany({ where: { ...audienceWhere(filter), phone: { not: null } } }),
    prisma.smsSuppression.findMany({ select: { phone: true } }),
  ]);
  const suppressed = new Set(suppressions.map((s) => s.phone));
  const seen = new Set<string>();

  const rows: Prisma.SmsSendCreateManyInput[] = [];
  for (const c of contacts) {
    const phone = (c.phone || "").trim();
    if (!phone || seen.has(phone) || suppressed.has(phone)) continue;
    seen.add(phone);
    rows.push({ campaignId, contactId: c.id, toPhone: c.phone!, toName: c.contactName });
  }

  await prisma.$transaction([
    prisma.smsSend.createMany({ data: rows, skipDuplicates: true }),
    prisma.smsCampaign.update({
      where: { id: campaignId },
      data: { status: campaign.scheduledAt && campaign.scheduledAt > new Date() ? "SCHEDULED" : "SENDING" },
    }),
  ]);
  return rows.length;
}

// Batch size per 15-minute tick. Amazon SES ramps up new accounts'
// sending rate gradually, and this keeps well under even a conservative
// limit while still clearing a few-thousand-contact list over a day.
const EMAIL_BATCH_PER_TICK = 40;
const SMS_BATCH_PER_TICK = 40;

export async function runDueEmailCampaignSends(baseUrl: string) {
  // Promote any SCHEDULED campaign whose time has come.
  await prisma.emailCampaign.updateMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    data: { status: "SENDING" },
  });

  const pending = await prisma.emailSend.findMany({
    where: { status: "PENDING", campaign: { status: "SENDING" } },
    include: { campaign: true, contact: true },
    take: EMAIL_BATCH_PER_TICK,
    orderBy: { createdAt: "asc" },
  });

  const results: { toEmail: string; error?: string }[] = [];

  for (const send of pending) {
    try {
      const subject = fillTemplate(send.campaign.subject, {
        contactName: send.contact?.contactName || send.toName || "",
        companyName: send.contact?.companyName || null,
      });
      const bodyHtml =
        fillTemplate(send.campaign.body, {
          contactName: send.contact?.contactName || send.toName || "",
          companyName: send.contact?.companyName || null,
        }) + unsubscribeFooterHtml(baseUrl, send.toEmail);

      const messageId = await sendSesEmail(send.toEmail, subject, bodyHtml);
      await prisma.emailSend.update({
        where: { id: send.id },
        data: { status: "SENT", sentAt: new Date(), externalId: messageId },
      });
      results.push({ toEmail: send.toEmail });
    } catch (err) {
      const error = err instanceof Error ? err.message : "send failed";
      await prisma.emailSend.update({ where: { id: send.id }, data: { status: "FAILED", error } });
      results.push({ toEmail: send.toEmail, error });
    }
  }

  await finalizeSentEmailCampaigns();
  return results;
}

async function finalizeSentEmailCampaigns() {
  const sending = await prisma.emailCampaign.findMany({ where: { status: "SENDING" } });
  for (const c of sending) {
    const remaining = await prisma.emailSend.count({ where: { campaignId: c.id, status: "PENDING" } });
    if (remaining === 0) {
      await prisma.emailCampaign.update({ where: { id: c.id }, data: { status: "SENT", sentAt: new Date() } });
    }
  }
}

export async function runDueSmsCampaignSends() {
  await prisma.smsCampaign.updateMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    data: { status: "SENDING" },
  });

  const pending = await prisma.smsSend.findMany({
    where: { status: "PENDING", campaign: { status: "SENDING" } },
    include: { campaign: true, contact: true },
    take: SMS_BATCH_PER_TICK,
    orderBy: { createdAt: "asc" },
  });

  const results: { toPhone: string; error?: string }[] = [];

  for (const send of pending) {
    try {
      const body =
        fillTemplate(send.campaign.body, {
          contactName: send.contact?.contactName || send.toName || "",
          companyName: send.contact?.companyName || null,
        }) + "\n\nReply STOP to unsubscribe.";

      const sid = await sendSms(send.toPhone, body);
      await prisma.smsSend.update({
        where: { id: send.id },
        data: { status: "SENT", sentAt: new Date(), externalId: sid },
      });
      results.push({ toPhone: send.toPhone });
    } catch (err) {
      const error = err instanceof Error ? err.message : "send failed";
      await prisma.smsSend.update({ where: { id: send.id }, data: { status: "FAILED", error } });
      results.push({ toPhone: send.toPhone, error });
    }
  }

  await finalizeSentSmsCampaigns();
  return results;
}

async function finalizeSentSmsCampaigns() {
  const sending = await prisma.smsCampaign.findMany({ where: { status: "SENDING" } });
  for (const c of sending) {
    const remaining = await prisma.smsSend.count({ where: { campaignId: c.id, status: "PENDING" } });
    if (remaining === 0) {
      await prisma.smsCampaign.update({ where: { id: c.id }, data: { status: "SENT", sentAt: new Date() } });
    }
  }
}
