import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getGmailMessage, markGmailRead, extractEmailAddress } from "@/lib/integrations/gmail";
import { findContactSummaryByEmail } from "@/lib/crm-contact";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  if (!conn) {
    return NextResponse.json({ error: "Gmail isn't connected." }, { status: 409 });
  }

  try {
    const message = await getGmailMessage(session.user.id, id);

    // Opening a message reads it, same as clicking it in Gmail — mark it
    // read there too so the two inboxes stay in sync. Fire-and-forget: a
    // failure here shouldn't stop the message from displaying.
    if (message.unread) {
      markGmailRead(session.user.id, id).catch(() => {});
    }

    const senderAddress = extractEmailAddress(message.from);
    const contact = senderAddress ? await findContactSummaryByEmail(senderAddress) : null;

    return NextResponse.json({ message, contact });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load this message." },
      { status: 502 }
    );
  }
}
