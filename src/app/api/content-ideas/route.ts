import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { tagContentIdea } from "@/lib/content-engine";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ideas = await prisma.contentIdea.findMany({
    include: { scripts: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ideas });
}

// Saves a swiped idea, then tags it with why it works in the background
// (best-effort — a failed/unconfigured tag just leaves hookPattern null,
// never blocks the save).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, sourceUrl, sourcePlatform, whyItWorks } = body as {
    title?: string;
    sourceUrl?: string;
    sourcePlatform?: string;
    whyItWorks?: string;
  };
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const idea = await prisma.contentIdea.create({
    data: {
      title: title.trim(),
      sourceUrl: sourceUrl?.trim() || null,
      sourcePlatform: sourcePlatform?.trim() || "instagram",
      whyItWorks: whyItWorks?.trim() || null,
      createdById: session.user.id,
    },
  });

  const tag = await tagContentIdea({ title: idea.title, whyItWorks: idea.whyItWorks }).catch(() => null);
  const final = tag
    ? await prisma.contentIdea.update({ where: { id: idea.id }, data: { hookPattern: tag } })
    : idea;

  return NextResponse.json({ idea: final });
}
