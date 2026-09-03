import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "brain")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const entries = await prisma.brainEntry.findMany({
    where: {
      ...(type ? { type: type as never } : {}),
      ...(category ? { category: category as never } : {}),
      ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "brain")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { type, category, source, content } = body as {
    type?: "LEARNING" | "THOUGHT" | "NOTE";
    category?: string;
    source?: string;
    content?: string;
  };

  if (!type || !content) {
    return NextResponse.json({ error: "type and content are required." }, { status: 400 });
  }

  const entry = await prisma.brainEntry.create({
    data: {
      type,
      category: (category as never) || "OTHER",
      source: source || null,
      content,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ entry });
}
