import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sanitizeScriptHtml } from "@/lib/sanitize-script-html";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sales")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scripts = await prisma.salesScript.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json({ scripts });
}

// Any rep with Sales access can read; only the owner can add/edit scripts —
// same split as Settings → Team elsewhere in the app.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { title, category, body: text } = body as { title?: string; category?: string; body?: string };
  if (!title || !category || !text) {
    return NextResponse.json({ error: "title, category, and body are required." }, { status: 400 });
  }
  const script = await prisma.salesScript.create({
    data: { title, category, body: sanitizeScriptHtml(text), updatedById: session.user.id },
  });
  return NextResponse.json({ script });
}
