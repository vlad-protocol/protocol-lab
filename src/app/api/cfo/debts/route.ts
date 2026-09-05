import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const debts = await prisma.cFODebt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ debts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, balance, monthlyPayment } = body as { name?: string; balance?: number; monthlyPayment?: number };
  if (!name || balance === undefined || monthlyPayment === undefined) {
    return NextResponse.json({ error: "name, balance, and monthlyPayment are required." }, { status: 400 });
  }
  const debt = await prisma.cFODebt.create({
    data: { userId: session.user.id, name, balance, monthlyPayment },
  });
  return NextResponse.json({ debt });
}
