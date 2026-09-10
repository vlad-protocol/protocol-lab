import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sequences = await prisma.emailSequence.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      steps: { orderBy: { order: "asc" } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  return NextResponse.json({ sequences });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sequences")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, steps } = body as {
    name?: string;
    description?: string;
    steps?: { delayDays: number; subject: string; body: string }[];
  };

  if (!name || !steps?.length) {
    return NextResponse.json({ error: "name and at least one step are required." }, { status: 400 });
  }

  const sequence = await prisma.emailSequence.create({
    data: {
      name,
      description: description || null,
      createdById: session.user.id,
      steps: {
        create: steps.map((s, i) => ({
          order: i,
          delayDays: Math.max(0, Number(s.delayDays) || 0),
          subject: s.subject,
          body: s.body,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ sequence });
}
