import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { title, sourceUrl, whyItWorks, status } = body as {
    title?: string;
    sourceUrl?: string;
    whyItWorks?: string;
    status?: "INBOX" | "SCRIPTED" | "ARCHIVED";
  };
  const idea = await prisma.contentIdea.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(sourceUrl !== undefined && { sourceUrl }),
      ...(whyItWorks !== undefined && { whyItWorks }),
      ...(status !== undefined && { status }),
    },
  });
  return NextResponse.json({ idea });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.contentIdea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
