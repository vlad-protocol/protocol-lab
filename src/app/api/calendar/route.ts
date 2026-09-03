import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "calendar")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const events = await prisma.calendarEvent.findMany({
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "calendar")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, startsAt, endsAt, allDay, location, notes, contactId } = body as {
    title?: string;
    startsAt?: string;
    endsAt?: string;
    allDay?: boolean;
    location?: string;
    notes?: string;
    contactId?: string;
  };
  if (!title || !startsAt || !endsAt) {
    return NextResponse.json({ error: "title, startsAt, and endsAt are required." }, { status: 400 });
  }
  const event = await prisma.calendarEvent.create({
    data: {
      title,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      allDay: !!allDay,
      location: location || null,
      notes: notes || null,
      contactId: contactId || null,
      createdById: session.user.id,
    },
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ event });
}
