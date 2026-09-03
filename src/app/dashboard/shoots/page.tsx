import { Kanban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ShootBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function ShootsPage() {
  await requireAccess("shoots");

  const [cards, contacts] = await Promise.all([
    prisma.shootCard.findMany({
      include: {
        contact: { select: { id: true, companyName: true, contactName: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: [{ stage: "asc" }, { order: "asc" }],
    }),
    prisma.contact.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
            <Kanban className="h-6 w-6 text-[var(--hq-accent)]" />
            Shoot Board
          </h1>
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
            Every piece of content in production, per client, left to right —
            Scripting, Film, Editing, Ready to Post, Posted. Drag a card to move it.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ShootBoard
          initialCards={cards.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            dueDate: c.dueDate ? c.dueDate.toISOString() : null,
          }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
