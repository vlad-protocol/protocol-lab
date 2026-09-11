import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Self-service — every teammate manages their own signature (it's
// appended per-sender, see lib/integrations/gmail.ts), so this only ever
// reads/writes the calling user's own row, no permission check beyond
// being signed in.

const FIELDS = [
  "signatureEnabled",
  "signatureName",
  "signatureTitle",
  "signatureCompany",
  "signatureAddress",
  "signaturePhone",
  "signatureEmail",
  "signatureWebsite",
  "signatureInstagram",
  "signatureFacebook",
  "signatureLogoUrl",
  "signatureAccent",
] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const select = Object.fromEntries(FIELDS.map((f) => [f, true]));
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select });
  return NextResponse.json({ signature: user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of FIELDS) {
    if (!(key in body)) continue;
    if (key === "signatureEnabled") {
      data[key] = !!body[key];
    } else {
      const v = body[key];
      data[key] = typeof v === "string" ? v.trim() || null : null;
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: Object.fromEntries(FIELDS.map((f) => [f, true])),
  });
  return NextResponse.json({ signature: user });
}
