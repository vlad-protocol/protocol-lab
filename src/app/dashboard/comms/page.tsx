import Link from "next/link";
import { MessageSquare, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";

export const dynamic = "force-dynamic";

export default async function CommsPage() {
  await requireAccess("comms");

  const [twilio, interactions] = await Promise.all([
    prisma.twilioConnection.findFirst({ orderBy: { connectedAt: "desc" } }),
    prisma.interaction.findMany({
      where: { type: { in: ["TEXT", "CALL"] } },
      include: {
        contact: { select: { id: true, contactName: true, companyName: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <MessageSquare className="h-6 w-6 text-[var(--hq-accent)]" />
        Comms
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Every text and call logged through the CRM, across the whole team.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
        {twilio ? (
          <p className="text-sm text-[var(--hq-text)]">
            Connected — texting and calling from{" "}
            <span className="font-medium">{twilio.phoneNumber}</span>.
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--hq-text-muted)]">
              Twilio isn't connected yet — texts and calls logged from a contact's page are
              recorded but not actually sent/dialed until it is.
            </p>
            <Link
              href="/dashboard/settings"
              className="rounded-full bg-[var(--hq-accent)] px-3 py-1.5 text-xs font-medium text-white"
            >
              Connect in Settings
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {interactions.length === 0 && (
          <p className="text-sm text-[var(--hq-text-muted)]">
            No texts or calls logged yet — log one from a contact's page to see it here.
          </p>
        )}
        {interactions.map((i) => (
          <Link
            key={i.id}
            href={`/dashboard/people/${i.contact.id}`}
            className="flex items-start gap-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4 hover:border-[var(--hq-accent)]"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--hq-accent-soft)] text-[var(--hq-accent)]">
              {i.type === "CALL" ? <Phone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--hq-text)]">
                  {i.contact.contactName}
                  {i.contact.companyName ? ` · ${i.contact.companyName}` : ""}
                </p>
                <p className="text-xs text-[var(--hq-text-muted)]">{new Date(i.occurredAt).toLocaleString()}</p>
              </div>
              {i.body && <p className="mt-0.5 line-clamp-1 text-sm text-[var(--hq-text-muted)]">{i.body}</p>}
              {i.recordingUrl && (
                <span className="text-xs font-medium text-[var(--hq-accent)]">Recording available →</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
