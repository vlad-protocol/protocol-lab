import { Brain as BrainIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { BrainView } from "./brain-view";

export const dynamic = "force-dynamic";

export default async function BrainPage() {
  await requireAccess("brain");

  const entries = await prisma.brainEntry.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <BrainIcon className="h-6 w-6 text-[var(--hq-accent)]" />
          Brain
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Your long-term library: learnings from books and podcasts, your own
          thoughts, and quick notes — captured in your own words, organized so
          you can find them later.
        </p>
      </div>

      <div className="mt-6">
        <BrainView
          initialEntries={entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
