import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, stepId } = await params;
  const step = await prisma.activationStep.findFirst({ where: { id: stepId, activationId: id } });
  if (!step) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { done?: boolean; owner?: string; dueDate?: string | null };
  const data: Record<string, unknown> = {};
  if (typeof body.done === "boolean") {
    data.done = body.done;
    data.doneAt = body.done ? new Date() : null;
  }
  if (typeof body.owner === "string" && body.owner.trim()) data.owner = body.owner.trim();
  if ("dueDate" in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await prisma.activationStep.update({ where: { id: stepId }, data });
  return NextResponse.json({ step: updated });
}
