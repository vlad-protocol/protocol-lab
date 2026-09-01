import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "automations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const automations = await prisma.automation.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ automations });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "automations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, triggerType, triggerConfig, actionType, actionConfig } = body as {
    name?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    actionType?: string;
    actionConfig?: Record<string, unknown>;
  };

  if (!name || !triggerType || !actionType) {
    return NextResponse.json(
      { error: "name, triggerType, and actionType are required." },
      { status: 400 }
    );
  }

  const automation = await prisma.automation.create({
    data: {
      name,
      triggerType: triggerType as never,
      triggerConfig: (triggerConfig || {}) as Prisma.InputJsonValue,
      actionType: actionType as never,
      actionConfig: (actionConfig || {}) as Prisma.InputJsonValue,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ automation });
}
