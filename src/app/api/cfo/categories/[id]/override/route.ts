import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { currentYearMonth } from "@/lib/cfo-server";

const MONTH_RE = /^\d{4}-\d{2}$/;

// Sets (or replaces) a one-off budget for this category for a single
// calendar month. Nothing needs to run later to undo it — a month with no
// row here just falls back to the category's normal monthlyBudget.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const category = await prisma.cFOBudgetCategory.findUnique({ where: { id } });
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await req.json();
  const { monthlyBudget } = body as { month?: string; monthlyBudget?: number };
  const month = (body as { month?: string }).month || currentYearMonth();
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM." }, { status: 400 });
  }
  if (typeof monthlyBudget !== "number" || Number.isNaN(monthlyBudget)) {
    return NextResponse.json({ error: "monthlyBudget must be a number." }, { status: 400 });
  }
  const override = await prisma.cFOBudgetOverride.upsert({
    where: { userId_categoryKey_yearMonth: { userId: session.user.id, categoryKey: category.key, yearMonth: month } },
    create: { userId: session.user.id, categoryKey: category.key, yearMonth: month, monthlyBudget },
    update: { monthlyBudget },
  });
  return NextResponse.json({ override });
}

// Clears the override for this category for the given month (default:
// current month), reverting that one month back to the normal budget.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const category = await prisma.cFOBudgetCategory.findUnique({ where: { id } });
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const month = new URL(req.url).searchParams.get("month") || currentYearMonth();
  await prisma.cFOBudgetOverride.deleteMany({
    where: { userId: session.user.id, categoryKey: category.key, yearMonth: month },
  });
  return NextResponse.json({ ok: true });
}
