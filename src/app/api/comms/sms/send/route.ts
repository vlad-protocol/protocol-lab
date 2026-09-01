import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { sendSms } from "@/lib/integrations/twilio";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "comms")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contactId, to, text, logOnly } = body as {
    contactId?: string;
    to?: string;
    text?: string;
    logOnly?: boolean;
  };

  if (!contactId || !to || !text) {
    return NextResponse.json({ error: "contactId, to, and text are required." }, { status: 400 });
  }

  let externalId: string | null = null;

  if (!logOnly) {
    try {
      externalId = await sendSms(to, text);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to send via Twilio." },
        { status: 409 }
      );
    }
  }

  const interaction = await prisma.interaction.create({
    data: {
      contactId,
      userId: session.user.id,
      type: "TEXT",
      direction: "OUTBOUND",
      body: text,
      phoneNumber: to,
      externalId,
    },
  });

  return NextResponse.json({ interaction, sent: !logOnly });
}
