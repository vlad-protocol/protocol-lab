import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { getOrSeedCategories } from "@/lib/cfo-server";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await getOrSeedCategories(session.user.id);
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { key, label, monthlyBudget } = body as { key?: string; label?: string; monthlyBudget?: number };
  if (!key || !label) {
    return NextResponse.json({ error: "key and label are required." }, { status: 400 });
  }
  const count = await prisma.cFOBudgetCategory.count({ where: { userId: session.user.id } });
  const category = await prisma.cFOBudgetCategory.create({
    data: {
      userId: session.user.id,
      key: key.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label,
      monthlyBudget: monthlyBudget ?? 0,
      order: count,
    },
  });
  return NextResponse.json({ category });
}
