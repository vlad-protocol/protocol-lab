import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Owner-only: set a rep's personal daily dial target.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { salesDailyDialTarget } = body as { salesDailyDialTarget?: number | null };
  const user = await prisma.user.update({
    where: { id },
    data: { salesDailyDialTarget: salesDailyDialTarget ?? null },
  });
  return NextResponse.json({ user: { id: user.id, salesDailyDialTarget: user.salesDailyDialTarget } });
}
