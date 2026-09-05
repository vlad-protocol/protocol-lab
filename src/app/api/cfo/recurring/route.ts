import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bills = await prisma.cFORecurringBill.findMany({
    where: { userId: session.user.id },
    orderBy: { dayOfMonth: "asc" },
  });
  return NextResponse.json({ bills });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { label, amount, dayOfMonth, category } = body as {
    label?: string;
    amount?: number;
    dayOfMonth?: number;
    category?: string;
  };
  if (!label || !amount || !dayOfMonth) {
    return NextResponse.json({ error: "label, amount, and dayOfMonth are required." }, { status: 400 });
  }
  const bill = await prisma.cFORecurringBill.create({
    data: { userId: session.user.id, label, amount, dayOfMonth, category: category || null },
  });
  return NextResponse.json({ bill });
}
