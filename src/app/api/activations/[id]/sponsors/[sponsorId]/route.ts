import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkSponsorSlot } from "@/lib/activation-sponsors";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; sponsorId: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, sponsorId } = await params;
  const activation = await prisma.activation.findUnique({ where: { id }, include: { sponsors: true } });
  if (!activation) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const sponsor = activation.sponsors.find((s) => s.id === sponsorId);
  if (!sponsor) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { category?: string; brandName?: string; tier?: string; fee?: number; confirmed?: boolean };
  const nextCategory = body.category ?? sponsor.category;
  const nextConfirmed = typeof body.confirmed === "boolean" ? body.confirmed : sponsor.confirmed;

  if (nextConfirmed) {
    const check = checkSponsorSlot({
      category: nextCategory,
      mainSponsorCategory: activation.mainSponsorCategory,
      existingCategories: activation.sponsors.filter((s) => s.confirmed && s.id !== sponsorId).map((s) => s.category),
    });
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  const updated = await prisma.sponsorSlot.update({
    where: { id: sponsorId },
    data: {
      category: nextCategory,
      brandName: body.brandName ?? sponsor.brandName,
      tier: body.tier ?? sponsor.tier,
      fee: body.fee ?? sponsor.fee,
      confirmed: nextConfirmed,
    },
  });
  return NextResponse.json({ sponsor: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; sponsorId: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sponsorId } = await params;
  await prisma.sponsorSlot.delete({ where: { id: sponsorId } });
  return NextResponse.json({ ok: true });
}
