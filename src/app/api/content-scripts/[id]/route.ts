import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { scoreContentScript } from "@/lib/content-engine";

const EDITABLE_FIELDS = ["title", "hook", "body", "closingPrompt", "productionFormat"] as const;
const STATUSES = ["DRAFT", "APPROVED", "FILMING", "EDITING", "READY", "POSTED", "ARCHIVED"];

// Hand edits re-score automatically (the score is only meaningful against
// the current text), unless the edit is a pure status/format move.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status;
  }

  const textChanged = ["hook", "body", "closingPrompt"].some((f) => f in data);
  let script = await prisma.contentScript.update({ where: { id }, data });

  if (textChanged) {
    const scored = await scoreContentScript({
      hook: script.hook,
      body: script.body,
      closingPrompt: script.closingPrompt || "",
    }).catch(() => null);
    if (scored) {
      script = await prisma.contentScript.update({
        where: { id },
        data: { viralityScore: scored.score, viralityNotes: scored.notes },
      });
    }
  }

  return NextResponse.json({ script });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_engine")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.contentScript.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
