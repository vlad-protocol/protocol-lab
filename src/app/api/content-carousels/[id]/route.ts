import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// Edits a carousel's title/status, and/or replaces its slide text
// wholesale (slides is a simple ordered string array from the client —
// easier for a slide-reorder UI than per-slide PATCH calls).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { title, status, slides } = body as { title?: string; status?: "DRAFT" | "READY" | "POSTED"; slides?: string[] };

  if (slides) {
    await prisma.contentCarouselSlide.deleteMany({ where: { carouselId: id } });
  }

  const carousel = await prisma.contentCarousel.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(status !== undefined && { status }),
      ...(slides && { slides: { create: slides.map((text, i) => ({ position: i, text })) } }),
    },
    include: { slides: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ carousel });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.contentCarousel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
