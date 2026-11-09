import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { repurposeWinningPost } from "@/lib/content-engine";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const carousels = await prisma.contentCarousel.findMany({
    include: {
      slides: { orderBy: { position: "asc" } },
      sourcePost: { select: { id: true, permalink: true, caption: true, thumbnailUrl: true, views: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ carousels });
}

// Repurposes one existing InstagramPost (a winner) into new hook angles
// plus a carousel slide breakdown, via Claude, then saves it as a DRAFT
// for editing before anyone schedules it.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { sourcePostId } = body as { sourcePostId?: string };
  if (!sourcePostId) {
    return NextResponse.json({ error: "Pick a post to repurpose." }, { status: 400 });
  }
  const sourcePost = await prisma.instagramPost.findUnique({ where: { id: sourcePostId } });
  if (!sourcePost) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  try {
    const result = await repurposeWinningPost({ caption: sourcePost.caption, transcript: sourcePost.transcript });
    const carousel = await prisma.contentCarousel.create({
      data: {
        title: result.title,
        newHooks: result.newHooks,
        sourcePostId,
        createdById: session.user.id,
        slides: {
          create: result.slides.map((text, i) => ({ position: i, text })),
        },
      },
      include: { slides: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json({ carousel });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Repurposing failed." }, { status: 500 });
  }
}
