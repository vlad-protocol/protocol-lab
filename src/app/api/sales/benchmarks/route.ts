import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sales")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const benchmarks = await prisma.salesBenchmark.findMany({ orderBy: { metricKey: "asc" } });
  return NextResponse.json({ benchmarks });
}

// Owner-only: adjust the red/amber/green thresholds for one metric.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { metricKey, amberMin, greenMin } = body as { metricKey?: string; amberMin?: number; greenMin?: number };
  if (!metricKey || typeof amberMin !== "number" || typeof greenMin !== "number") {
    return NextResponse.json({ error: "metricKey, amberMin, and greenMin are required." }, { status: 400 });
  }
  const benchmark = await prisma.salesBenchmark.update({
    where: { metricKey },
    data: { amberMin, greenMin },
  });
  return NextResponse.json({ benchmark });
}
