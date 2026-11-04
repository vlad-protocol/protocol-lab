import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const posts = await prisma.instagramPost.findMany({
    include: { events: { select: { id: true, name: true } } },
    orderBy: { postedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ posts });
}
