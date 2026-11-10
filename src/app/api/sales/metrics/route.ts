import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computeSalesMetrics, resolveRange } from "@/lib/sales-metrics";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sales")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "today";
  const repId = searchParams.get("repId") || undefined;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const { from, to } =
    range === "custom" && fromParam && toParam
      ? { from: new Date(fromParam + "T00:00:00"), to: new Date(new Date(toParam + "T23:59:59.999")) }
      : resolveRange(range);

  const [metrics, reps, benchmarks] = await Promise.all([
    computeSalesMetrics({ from, to, repId }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, salesDailyDialTarget: true },
      orderBy: { name: "asc" },
    }),
    prisma.salesBenchmark.findMany({ orderBy: { metricKey: "asc" } }),
  ]);

  return NextResponse.json({ metrics, reps, benchmarks });
}
