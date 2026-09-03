import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "lab")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");

  const entries = await prisma.studioEntry.findMany({
    where: kind ? { kind: kind as never } : undefined,
    include: {
      client: { select: { id: true, companyName: true, contactName: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "lab")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { kind, title, clientId, platform, sourceUrl, content, breakdown, tags } = body as {
    kind?: "AD" | "SCRIPT" | "TREND";
    title?: string;
    clientId?: string;
    platform?: string;
    sourceUrl?: string;
    content?: string;
    breakdown?: string;
    tags?: string[];
  };

  if (!kind || !title) {
    return NextResponse.json({ error: "kind and title are required." }, { status: 400 });
  }

  const entry = await prisma.studioEntry.create({
    data: {
      kind,
      title,
      clientId: clientId || null,
      platform: platform || null,
      sourceUrl: sourceUrl || null,
      content: content || null,
      breakdown: breakdown || null,
      tags: tags || [],
      createdById: session.user.id,
    },
    include: {
      client: { select: { id: true, companyName: true, contactName: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ entry });
}
