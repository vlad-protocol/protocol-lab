import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { parseWealthsimpleText, parseWealthsimpleCSV, applyMerchantRules } from "@/lib/cfo-parser";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { text, format } = body as { text?: string; format?: "text" | "csv" };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Paste some transaction text first." }, { status: 400 });
  }

  const rules = await prisma.cFOMerchantRule.findMany({ where: { userId: session.user.id } });
  const parsed = format === "csv" ? parseWealthsimpleCSV(text) : parseWealthsimpleText(text);
  if (format === "csv" && parsed.length === 0) {
    return NextResponse.json(
      { error: "That doesn't look like a Wealthsimple activity export CSV." },
      { status: 400 }
    );
  }
  const rows = applyMerchantRules(parsed, rules);

  return NextResponse.json({ rows });
}
