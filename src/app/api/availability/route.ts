import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// GET is intentionally public — the /book page needs it to show open windows
// to people who aren't logged in.
export async function GET() {
  const availabilities = await prisma.availability.findMany({
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
    data: { dayOfWeek, startTime, endTime, createdById: session.user.id },
  });
  return NextResponse.json({ availability });
}
