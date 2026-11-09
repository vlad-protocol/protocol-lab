import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.instagramConnection.findMany({
    orderBy: { connectedAt: "desc" },
    select: { id: true, igUserId: true, username: true, label: true, connectedAt: true },
  });
  return NextResponse.json({ accounts });
}
