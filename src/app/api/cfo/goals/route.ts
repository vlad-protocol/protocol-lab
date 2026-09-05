import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const goals = await prisma.cFOGoal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, targetAmount, savedSoFar, targetDate } = body as {
    name?: string;
    targetAmount?: number;
    savedSoFar?: number;
    targetDate?: string;
  };
  if (!name || !targetAmount) {
    return NextResponse.json({ error: "name and targetAmount are required." }, { status: 400 });
  }
  const goal = await prisma.cFOGoal.create({
    data: {
      userId: session.user.id,
      name,
      targetAmount,
      savedSoFar: savedSoFar ?? 0,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  });
  return NextResponse.json({ goal });
}
