import { Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { IGAutomationsView } from "./ig-automations-view";

export const dynamic = "force-dynamic";

export default async function IGAutomationsPage() {
  await requireAccess("ig_automations");

  const automations = await prisma.iGAutomation.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-3xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Zap className="h-6 w-6 text-[var(--hq-accent)]" />
          IG Automations
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Define the rules now — "comment 'PRICE' → auto-DM the price list,"
          that kind of thing. These are saved and ready, but won&apos;t actually
          fire on Instagram until a connected Meta/Instagram Graph API app is
          wired in (that needs its own app review from Meta) — ask me to
          connect it once you're ready to apply for that.
        </p>
      </div>

      <div className="mt-6">
        <IGAutomationsView initialAutomations={automations} />
      </div>
    </div>
  );
}
