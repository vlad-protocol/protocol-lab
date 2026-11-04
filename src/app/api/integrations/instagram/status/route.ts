import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isInstagramConfigured } from "@/lib/integrations/instagram";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.instagramConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  return NextResponse.json({
    configured: isInstagramConfigured(),
    connected: !!conn,
    username: conn?.username || null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.instagramConnection.deleteMany({});
  return NextResponse.json({ ok: true });
}
