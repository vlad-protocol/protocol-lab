import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkSponsorSlot } from "@/lib/activation-sponsors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const activation = await prisma.activation.findUnique({ where: { id }, include: { sponsors: true } });
  if (!activation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { category?: string; brandName?: string; tier?: string; fee?: number };
  if (!body.category) return NextResponse.json({ error: "Category is required." }, { status: 400 });

  const check = checkSponsorSlot({
    category: body.category,
    mainSponsorCategory: activation.mainSponsorCategory,
    existingCategories: activation.sponsors.filter((s) => s.confirmed).map((s) => s.category),
  });
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 409 });

  const sponsor = await prisma.sponsorSlot.create({
    data: { activationId: id, category: body.category, brandName: body.brandName || null, tier: body.tier || null, fee: body.fee ?? null },
  });
  return NextResponse.json({ sponsor });
}
