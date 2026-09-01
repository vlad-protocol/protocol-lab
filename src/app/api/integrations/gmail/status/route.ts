import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isGmailConfigured } from "@/lib/integrations/gmail";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.gmailConnection.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({
    configured: isGmailConfigured(),
    connected: !!conn,
    email: conn?.email || null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.gmailConnection.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
