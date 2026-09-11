import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getGmailMessage, markGmailRead } from "@/lib/integrations/gmail";

// Fetches the real, full email (html/text body, To/Cc, threading
// headers) for one logged Interaction, live from Gmail — the Interaction
// row only ever stores a short snippet, so viewing/replying/forwarding
// from the contact page needs to go back to the source. Uses the
// CURRENT viewer's own connected Gmail account, which works as long as
// that's the account the mail actually lives in (the common case here —
// one connected mailbox for the whole team).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, interactionId } = await params;

  const interaction = await prisma.interaction.findUnique({ where: { id: interactionId } });
  if (!interaction || interaction.contactId !== id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (interaction.type !== "EMAIL" || !interaction.externalId) {
    return NextResponse.json({ error: "This entry isn't a synced email." }, { status: 400 });
  }

  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  if (!conn) {
    return NextResponse.json({ error: "Gmail isn't connected." }, { status: 409 });
  }

  try {
    const message = await getGmailMessage(session.user.id, interaction.externalId);
    if (message.unread) markGmailRead(session.user.id, interaction.externalId).catch(() => {});
    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Couldn't load the full email — it may not be in this mailbox.",
        gmailLink: `https://mail.google.com/mail/u/0/#all/${interaction.externalId}`,
      },
      { status: 502 }
    );
  }
}
