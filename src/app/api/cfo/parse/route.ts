import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { parseWealthsimpleText, applyMerchantRules } from "@/lib/cfo-parser";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { text } = body as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Paste some transaction text first." }, { status: 400 });
  }

  const rules = await prisma.cFOMerchantRule.findMany({ where: { userId: session.user.id } });
  const rows = applyMerchantRules(parseWealthsimpleText(text), rules);

  return NextResponse.json({ rows });
}
