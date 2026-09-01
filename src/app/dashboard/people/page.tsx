import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { AddContactButton } from "./add-contact-button";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  LEAD: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-blue-50 text-blue-700",
  CLIENT: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-neutral-100 text-neutral-500",
};

export default async function PeoplePage() {
  await requireAccess("people");

  const reps = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  const contacts = await prisma.contact.findMany({
    include: {
      assignedRep: { select: { name: true, email: true } },
      interactions: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
            <Users className="h-6 w-6 text-[var(--hq-accent)]" />
            People
          </h1>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
            Every company and contact you're in touch with, who's assigned to them,
            and when they were last contacted — one shared view for the whole team.
          </p>
        </div>
        <AddContactButton reps={reps} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] text-xs uppercase text-[var(--hq-text-muted)]">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned rep</th>
              <th className="px-4 py-3">Last contact</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--hq-text-muted)]" colSpan={6}>
                  No contacts yet. Add your first one above.
                </td>
              </tr>
            )}
            {contacts.map((c) => {
              const last = c.interactions[0];
              return (
                <tr key={c.id} className="border-b border-[var(--hq-card-border)] last:border-0 hover:bg-[var(--hq-canvas)]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/people/${c.id}`} className="font-medium text-[var(--hq-text)] hover:underline">
                      {c.contactName}
                    </Link>
                    {c.title && <p className="text-xs text-[var(--hq-text-muted)]">{c.title}</p>}
                  </td>
                  <td className="px-4 py-3 text-[var(--hq-text-muted)]">{c.companyName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--hq-text-muted)]">
                    {c.assignedRep?.name || c.assignedRep?.email || "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-[var(--hq-text-muted)]">
                    {last ? new Date(last.occurredAt).toLocaleDateString() : "No contact yet"}
                  </td>
                  <td className="px-4 py-3 text-[var(--hq-text-muted)]">
                    {last?.user?.name || last?.user?.email || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
