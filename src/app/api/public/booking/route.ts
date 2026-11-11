import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const eventTypes = await prisma.bookingEventType.findMany({
    where: { active: true },
    select: { slug: true, name: true, description: true, durationMinutes: true, host: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ eventTypes });
}
