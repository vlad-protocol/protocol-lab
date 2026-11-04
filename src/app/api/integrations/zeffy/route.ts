import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conn = await prisma.zeffyConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  return NextResponse.json({ connected: !!conn });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { apiKey } = body as { apiKey?: string };
  if (!apiKey) return NextResponse.json({ error: "An API key is required." }, { status: 400 });

  await prisma.zeffyConnection.deleteMany({});
  await prisma.zeffyConnection.create({ data: { apiKey: encryptSecret(apiKey) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.zeffyConnection.deleteMany({});
  return NextResponse.json({ ok: true });
}
