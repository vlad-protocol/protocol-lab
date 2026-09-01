import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ContactHeader } from "./contact-header";
import { Timeline } from "./timeline";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAccess("people");
  const { id } = await params;

  const [contact, reps] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        assignedRep: { select: { id: true, name: true, email: true } },
        interactions: {
          orderBy: { occurredAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!contact) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href="/dashboard/people"
        className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All people
      </Link>

      <ContactHeader contact={contact} reps={reps} canDelete={session.user.role === "OWNER"} />

      <Timeline
        contactId={contact.id}
        interactions={contact.interactions.map((i) => ({ ...i, occurredAt: i.occurredAt.toISOString() }))}
        contactEmail={contact.email}
        contactPhone={contact.phone}
      />
    </div>
  );
}
