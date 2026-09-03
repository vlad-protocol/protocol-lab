import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status?: "PENDING" | "CONFIRMED" | "DECLINED" };
  if (!status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 });
  }
  const request = await prisma.bookingRequest.update({ where: { id }, data: { status } });
  return NextResponse.json({ request });
}
