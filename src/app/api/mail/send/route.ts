import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { sendGmail } from "@/lib/integrations/gmail";
import { findOrCreateContactByEmail } from "@/lib/crm-contact";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contactId: rawContactId, to, subject, text, logOnly } = body as {
    contactId?: string;
    to?: string;
    subject?: string;
    text?: string;
    logOnly?: boolean; // true = "I sent this myself elsewhere, just log it"
  };

  if (!to || !subject || !text) {
    return NextResponse.json(
      { error: "to, subject, and text are required." },
      { status: 400 }
    );
  }

  // Sending from the general Mail page (not a contact's page) won't have a
  // contactId — find an existing CRM contact by email, or create a new lead
  // for them, so the send still shows up in that contact's timeline.
  const contactId = rawContactId || (await findOrCreateContactByEmail(to, session.user.id));

  let externalId: string | null = null;

  if (!logOnly) {
    const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
    if (!conn) {
      return NextResponse.json(
        {
          error:
            "You haven't connected Gmail yet. Connect it in Settings, or resend with logOnly to just record that you sent it elsewhere.",
          code: "GMAIL_NOT_CONNECTED",
        },
        { status: 409 }
      );
    }
    try {
      externalId = await sendGmail(session.user.id, to, subject, text);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to send via Gmail." },
        { status: 502 }
      );
    }
  }

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

  return NextResponse.json({ interaction, sent: !logOnly });
}
