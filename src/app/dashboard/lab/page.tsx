import { FlaskConical } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { LabView } from "./lab-view";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  await requireAccess("lab");

  const [entries, contacts] = await Promise.all([
    prisma.studioEntry.findMany({
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <FlaskConical className="h-6 w-6 text-[var(--hq-accent)]" />
          Content Lab
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Break down well-performing ads and scripts, and log trends you spot —
          then use it to coach clients on their own ad-making. This is manual
          capture for now; a live Meta Ads pull is the natural next step once
          an ad account is connected.
        </p>
      </div>

      <div className="mt-6">
        <LabView
          initialEntries={entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
