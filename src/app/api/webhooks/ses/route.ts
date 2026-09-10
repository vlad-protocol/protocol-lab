import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Registered as the delivery endpoint for the SNS topic that Amazon SES
// publishes bounce/complaint notifications to. Set this route's full URL
// (https://your-app-url/api/webhooks/ses) as an HTTPS subscriber on that
// topic in the SNS console — see the README for the exact SES setup.
//
// Two message types arrive here:
//  - SubscriptionConfirmation: SNS asks us to prove we own this endpoint
//    by fetching the SubscribeURL it hands us. Nothing to store.
//  - Notification: the actual bounce/complaint payload — we pull out the
//    recipient address(es) and add them to EmailSuppression so no future
//    campaign ever emails them again.
//
// Note: this does not cryptographically verify SNS's message signature
// (that requires fetching and validating against Amazon's signing
// certificate chain). As a lightweight guard, add SES_WEBHOOK_SECRET and
// use that same value as a query string (?secret=...) on the subscribed
// endpoint URL so a stranger can't feed this endpoint fake bounces.
export async function POST(req: Request) {
  const secret = process.env.SES_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = envelope.Type as string | undefined;

  if (type === "SubscriptionConfirmation") {
    const subscribeUrl = envelope.SubscribeURL as string | undefined;
    if (subscribeUrl) {
      try {
        await fetch(subscribeUrl);
      } catch (err) {
        console.error("[ses-webhook] failed to confirm SNS subscription:", err);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "Notification") {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(envelope.Message as string);
    } catch {
      return NextResponse.json({ ok: true }); // nothing we can parse — ack anyway so SNS doesn't retry forever
    }

    const notificationType = message.notificationType as string | undefined;

    try {
      if (notificationType === "Bounce") {
        const recipients = ((message.bounce as Record<string, unknown>)?.bouncedRecipients as
          | { emailAddress?: string }[]
          | undefined) || [];
        for (const r of recipients) {
          if (!r.emailAddress) continue;
          await upsertSuppression(r.emailAddress, "BOUNCE");
        }
      } else if (notificationType === "Complaint") {
        const recipients = ((message.complaint as Record<string, unknown>)?.complainedRecipients as
          | { emailAddress?: string }[]
          | undefined) || [];
        for (const r of recipients) {
          if (!r.emailAddress) continue;
          await upsertSuppression(r.emailAddress, "COMPLAINT");
        }
      }
    } catch (err) {
      console.error("[ses-webhook] failed to record suppression:", err);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function upsertSuppression(email: string, reason: "BOUNCE" | "COMPLAINT") {
  const normalized = email.toLowerCase().trim();
  await prisma.emailSuppression.upsert({
    where: { email: normalized },
    update: { reason },
    create: { email: normalized, reason },
  });
}
