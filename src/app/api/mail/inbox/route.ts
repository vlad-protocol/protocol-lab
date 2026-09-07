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

    // Log every inbound message that matches an existing contact as an
    // Interaction, so the contact's page shows the whole conversation
    // (what we sent + what they wrote back), not just our outbound sends.
    // Deduped on externalId (the Gmail message id) so refreshing the inbox
    // repeatedly doesn't create duplicate history. Unmatched senders (a
    // stranger, a newsletter) are left alone — only conversations with a
    // real contact get logged.
    const matched = withContacts.filter((m) => m.contact);
    if (matched.length > 0) {
      const ids = matched.map((m) => m.id);
      const already = await prisma.interaction.findMany({
        where: { externalId: { in: ids } },
        select: { externalId: true },
      });
      const alreadySynced = new Set(already.map((i) => i.externalId));
      const toCreate = matched.filter((m) => !alreadySynced.has(m.id));
      if (toCreate.length > 0) {
        await prisma.interaction.createMany({
          data: toCreate.map((m) => {
            const parsedDate = new Date(m.date);
            return {
              contactId: m.contact!.id,
              type: "EMAIL" as const,
              direction: "INBOUND" as const,
              subject: m.subject || null,
              body: m.snippet || null,
              fromAddress: extractEmailAddress(m.from) || m.from,
              toAddress: extractEmailAddress(m.to) || m.to || null,
              externalId: m.id,
              occurredAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            };
          }),
        });
      }
    }

    return NextResponse.json({ messages: withContacts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load inbox." },
      { status: 502 }
    );
  }
}
