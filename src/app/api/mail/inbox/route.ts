import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { listGmailInbox, extractEmailAddress } from "@/lib/integrations/gmail";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "mail")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  if (!conn) {
    return NextResponse.json({ error: "Gmail isn't connected." }, { status: 409 });
  }

  try {
    const messages = await listGmailInbox(session.user.id, 25);

    // Match each message's sender against a CRM contact by email so the
    // inbox can link straight through to the contact record.
    const senderAddresses = Array.from(
      new Set(
        messages
          .map((m) => extractEmailAddress(m.from))
          .filter((addr): addr is string => !!addr)
      )
    );
    const contacts = senderAddresses.length
      ? await prisma.contact.findMany({
          where: { email: { in: senderAddresses, mode: "insensitive" } },
          select: { id: true, contactName: true, companyName: true, email: true },
        })
      : [];
    const byEmail = new Map(contacts.map((c) => [c.email!.toLowerCase(), c]));

    const withContacts = messages.map((m) => {
      const addr = extractEmailAddress(m.from);
      const contact = addr ? byEmail.get(addr.toLowerCase()) || null : null;
      return { ...m, contact };
    });

    return NextResponse.json({ messages: withContacts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load inbox." },
      { status: 502 }
    );
  }
}
