import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { draftContentScript, scoreContentScript } from "@/lib/content-engine";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scripts = await prisma.contentScript.findMany({
    include: { idea: { select: { id: true, title: true } }, posts: { select: { id: true, status: true, scheduledFor: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ scripts });
}

// Drafts a script with Claude from an idea (or a bare topic typed in
// directly) and scores it immediately, then saves both — the draft and
// the score are always just a starting point a human edits before
// moving it past DRAFT.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { ideaId, topic } = body as { ideaId?: string; topic?: string };

  let whyItWorks: string | null = null;
  let resolvedTopic = topic?.trim() || "";
  if (ideaId) {
    const idea = await prisma.contentIdea.findUnique({ where: { id: ideaId } });
    if (!idea) return NextResponse.json({ error: "Idea not found." }, { status: 404 });
    resolvedTopic = resolvedTopic || idea.title;
    whyItWorks = idea.whyItWorks;
  }
  if (!resolvedTopic) {
    return NextResponse.json({ error: "Give a topic, or pick an idea to draft from." }, { status: 400 });
  }

  try {
    const drafted = await draftContentScript({ topic: resolvedTopic, whyItWorks });
    const scored = await scoreContentScript(drafted);

    const script = await prisma.contentScript.create({
      data: {
        title: drafted.title,
        hook: drafted.hook,
        body: drafted.body,
        closingPrompt: drafted.closingPrompt,
        viralityScore: scored.score,
        viralityNotes: scored.notes,
        ideaId: ideaId || null,
        createdById: session.user.id,
      },
    });

    if (ideaId) {
      await prisma.contentIdea.update({ where: { id: ideaId }, data: { status: "SCRIPTED" } });
    }

    return NextResponse.json({ script });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Drafting failed." }, { status: 500 });
  }
}
