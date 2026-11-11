import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");

  const bookings = await prisma.booking.findMany({
    where: scope === "all" && session.user.role === "OWNER" ? {} : { hostUserId: session.user.id },
    include: {
      eventType: { select: { name: true, slug: true } },
      host: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true } },
      answers: true,
    },
    orderBy: { startsAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      ...b,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      canceledAt: b.canceledAt ? b.canceledAt.toISOString() : null,
    })),
  });
}
