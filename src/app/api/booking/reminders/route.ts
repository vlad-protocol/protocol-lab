import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Reminders are account-wide rules (optionally scoped to one event
// type) — managed by the owner, same as how Calendly's own Workflows are
// owner/admin-managed, since they're really a messaging policy for the
// whole team rather than a personal setting.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reminders = await prisma.bookingReminder.findMany({
    include: { eventType: { select: { name: true } } },
    orderBy: { minutesBefore: "desc" },
  });
  return NextResponse.json({ reminders });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can manage reminder rules." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { eventTypeId, minutesBefore, channel, messageTemplate } = body as {
    eventTypeId?: string | null;
    minutesBefore?: number;
    channel?: "EMAIL" | "SMS";
    messageTemplate?: string;
  };
  if (!minutesBefore || minutesBefore <= 0) {
    return NextResponse.json({ error: "minutesBefore must be a positive number." }, { status: 400 });
  }
  if (channel !== "EMAIL" && channel !== "SMS") {
    return NextResponse.json({ error: "channel must be EMAIL or SMS." }, { status: 400 });
  }
  if (!messageTemplate?.trim()) {
    return NextResponse.json({ error: "A message template is required." }, { status: 400 });
  }
  const reminder = await prisma.bookingReminder.create({
    data: { eventTypeId: eventTypeId || null, minutesBefore, channel, messageTemplate: messageTemplate.trim() },
  });
  return NextResponse.json({ reminder });
}
