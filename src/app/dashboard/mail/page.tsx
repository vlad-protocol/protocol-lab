import Link from "next/link";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { GmailConnectCard } from "./gmail-connect-card";

export const dynamic = "force-dynamic";

export default async function MailPage() {
  const session = await requireAccess("mail");

  const [connection, emails] = await Promise.all([
    prisma.gmailConnection.findUnique({ where: { userId: session.user.id } }),
    prisma.interaction.findMany({
      where: { type: "EMAIL" },
      include: { contact: { select: { id: true, contactName: true, companyName: true } }, user: { select: { name: true, email: true } } },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <Mail className="h-6 w-6 text-[var(--hq-accent)]" />
        Mail
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Every email sent through the CRM, across the whole team, in one feed.
      </p>

      <GmailConnectCard connected={!!connection} email={connection?.email || null} />

      <div className="mt-6 space-y-2">
        {emails.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            No emails logged yet — send one from a contact's page to see it here.
          </p>
        )}
        {emails.map((e) => (
          <Link
            key={e.id}
            href={`/dashboard/people/${e.contact.id}`}
            className="block rounded-xl border border-[var(--hq-card-border)] bg-white p-4 hover:border-[var(--hq-accent)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--hq-text)]">{e.subject || "(no subject)"}</p>
              <p className="text-xs text-[var(--hq-text-muted)]">{new Date(e.occurredAt).toLocaleString()}</p>
            </div>
            <p className="text-xs text-[var(--hq-text-muted)]">
              To {e.contact.contactName}
              {e.contact.companyName ? ` · ${e.contact.companyName}` : ""} · sent by{" "}
              {e.user?.name || e.user?.email || "someone"}
            </p>
            {e.body && <p className="mt-1 line-clamp-2 text-sm text-[var(--hq-text-muted)]">{e.body}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
