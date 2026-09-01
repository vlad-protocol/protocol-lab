import { Workflow } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { AutomationsClient } from "./automations-client";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  await requireAccess("automations");

  const automations = await prisma.automation.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <Workflow className="h-6 w-6 text-[var(--hq-accent)]" />
        Automations
      </h1>
      <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
        Trigger → action rules for your CRM. There's no background scheduler running yet
        (Railway doesn't run cron for you automatically), so these run when you hit
        "Run now" — wiring a real schedule is a follow-up once this is deployed.
      </p>

      <AutomationsClient
        initialAutomations={automations.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
