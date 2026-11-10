import { PhoneCall } from "lucide-react";
import { requireAccess } from "@/lib/require-access";
import { prisma } from "@/lib/prisma";
import { SalesDashboardView } from "./sales-dashboard-view";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const session = await requireAccess("sales");

  const scripts = await prisma.salesScript.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <PhoneCall className="h-6 w-6 text-[var(--hq-accent)]" />
          Sales
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Live call-tracking, synced straight from every call logged on a lead's Communication
          Log — nothing extra to fill in here. Tag a call's outcome there (or right on the Log
          call form) and it shows up below automatically, broken down by rep.
        </p>
      </div>

      <div className="mt-6">
        <SalesDashboardView
          scripts={scripts.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }))}
          isOwner={session.user.role === "OWNER"}
        />
      </div>
    </div>
  );
}
