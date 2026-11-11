import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// Every rep sets their own weekly hours — this used to be one global
// set shared by everyone; now it's keyed to whoever is logged in and
// drives slot availability only for THEIR event types/links.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const availabilities = await prisma.availability.findMany({
    where: { hostUserId: session.user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ availabilities });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { dayOfWeek, startTime, endTime } = body as {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
  };
  if (dayOfWeek === undefined || !startTime || !endTime) {
    return NextResponse.json(
      { error: "dayOfWeek, startTime, and endTime are required." },
      { status: 400 }
    );
  }
  const availability = await prisma.availability.create({
    data: { dayOfWeek, startTime, endTime, hostUserId: session.user.id },
  });
  return NextResponse.json({ availability });
}
