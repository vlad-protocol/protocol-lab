import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// Manual overrides — link/unlink events, or fix a mis-categorized post by
// hand rather than waiting on a re-run.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { eventIds, contentCategory } = body as { eventIds?: string[]; contentCategory?: string };

  const post = await prisma.instagramPost.update({
    where: { id },
    data: {
      ...(eventIds !== undefined && { events: { set: eventIds.map((id) => ({ id })) } }),
      ...(contentCategory !== undefined && { contentCategory }),
    },
    include: { events: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ post });
}
