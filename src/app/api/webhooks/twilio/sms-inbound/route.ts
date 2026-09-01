import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Registered as the "A message comes in" webhook on your Twilio number.
// Matches the sender's number to a Contact and logs it — this is how a
// client texting your business number shows up in their CRM thread
// automatically, without anyone having to log it by hand.
export async function POST(req: Request) {
  const form = await req.formData();
  const from = form.get("From") as string | null;
  const body = form.get("Body") as string | null;
  const messageSid = form.get("MessageSid") as string | null;

  if (from && body) {
    const contact = await prisma.contact.findFirst({ where: { phone: from } });
    if (contact) {
      await prisma.interaction.create({
        data: {
          contactId: contact.id,
          type: "TEXT",
          direction: "INBOUND",
          body,
          phoneNumber: from,
          externalId: messageSid,
        },
      });
    }
  }

  return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
