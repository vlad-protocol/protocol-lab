import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cancelBooking } from "@/lib/booking";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing || (session.user.role !== "OWNER" && existing.hostUserId !== session.user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };
  const booking = await cancelBooking(id, reason);
  return NextResponse.json({ booking });
}
