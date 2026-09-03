import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "ig_automations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const automations = await prisma.iGAutomation.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ automations });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "ig_automations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, trigger, keyword, replyText } = body as {
    name?: string;
    trigger?: "COMMENT_KEYWORD" | "DM_KEYWORD" | "NEW_FOLLOWER";
    keyword?: string;
    replyText?: string;
  };
  if (!name || !trigger) {
    return NextResponse.json({ error: "name and trigger are required." }, { status: 400 });
  }
  const automation = await prisma.iGAutomation.create({
    data: {
      name,
      trigger,
      keyword: keyword || null,
      replyText: replyText || null,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ automation });
}
