import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendGmailReply } from "@/lib/integrations/gmail";
import { findOrCreateContactByEmail } from "@/lib/crm-contact";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { to, cc, subject, text, threadId, inReplyTo, references } = body as {
    to?: string;
    cc?: string;
    subject?: string;
    text?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  };

  if (!to || !subject || !text) {
    return NextResponse.json({ error: "to, subject, and text are required." }, { status: 400 });
  }

  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  if (!conn) {
    return NextResponse.json(
      { error: "You haven't connected Gmail yet.", code: "GMAIL_NOT_CONNECTED" },
      { status: 409 }
    );
  }

  let externalId: string;
  try {
    externalId = await sendGmailReply(session.user.id, { to, cc, subject, body: text, threadId, inReplyTo, references });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send via Gmail." },
      { status: 502 }
    );
  }

  const contactId = await findOrCreateContactByEmail(to, session.user.id);
  const interaction = await prisma.interaction.create({
    data: {
      contactId,
      userId: session.user.id,
      type: "EMAIL",
      direction: "OUTBOUND",
      subject,
      body: text,
      toAddress: to,
      externalId,
    },
  });

  return NextResponse.json({ interaction, sent: true });
}
