import { GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { SalesCoachView } from "./sales-coach-view";

export const dynamic = "force-dynamic";

export default async function SalesCoachPage() {
  await requireAccess("sales_coach");

  const calls = await prisma.interaction.findMany({
    where: { type: { in: ["CALL", "VIDEO_CALL"] }, transcriptStatus: "DONE", transcript: { not: null } },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { occurredAt: "desc" },
  });

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <GraduationCap className="h-6 w-6 text-[var(--hq-accent)]" />
          Sales Coach
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Every transcribed phone call and Zoom discovery call in one place. Pick one and talk it
          through — what went well, what went wrong, what you missed, what to say differently
          next time.
        </p>
      </div>

      <div className="mt-6">
        <SalesCoachView
          calls={calls.map((c) => ({
            id: c.id,
            type: c.type as "CALL" | "VIDEO_CALL",
            direction: c.direction as "INBOUND" | "OUTBOUND",
            occurredAt: c.occurredAt.toISOString(),
            durationSeconds: c.durationSeconds,
            transcript: c.transcript as string,
            contact: c.contact,
          }))}
        />
      </div>
    </div>
  );
}
