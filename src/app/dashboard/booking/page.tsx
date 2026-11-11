import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { BookingView } from "./booking-view";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const session = await requireAccess("booking");
  const userId = session.user.id;
  const isOwner = session.user.role === "OWNER";

  const [eventTypes, availabilities, bookings, gmailConnection, reminders, users] = await Promise.all([
    prisma.bookingEventType.findMany({
      where: isOwner ? {} : { hostUserId: userId },
      include: {
        questions: { orderBy: { order: "asc" } },
        host: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.availability.findMany({ where: { hostUserId: userId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.booking.findMany({
      where: isOwner ? {} : { hostUserId: userId },
      include: {
        eventType: { select: { name: true, slug: true } },
        host: { select: { id: true, name: true, email: true } },
        answers: true,
      },
      orderBy: { startsAt: "desc" },
      take: 200,
    }),
    prisma.gmailConnection.findUnique({ where: { userId } }),
    isOwner
      ? prisma.bookingReminder.findMany({ include: { eventType: { select: { name: true } } }, orderBy: { minutesBefore: "desc" } })
      : Promise.resolve([]),
    isOwner ? prisma.user.findMany({ select: { id: true, name: true, email: true } }) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-6xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <CalendarClock className="h-6 w-6 text-[var(--hq-accent)]" />
          Booking
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Share a public link, people pick an open time and answer any qualification questions you ask,
          and it books instantly — synced straight to your Google Calendar if it&apos;s connected.
        </p>
      </div>

      <div className="mt-6">
        <BookingView
          isOwner={isOwner}
          currentUserId={userId}
          users={users}
          gmailConnected={!!gmailConnection}
          gmailEmail={gmailConnection?.email || null}
          initialEventTypes={eventTypes.map((e) => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            bookingCount: e._count.bookings,
          }))}
          initialAvailabilities={availabilities}
          initialBookings={bookings.map((b) => ({
            ...b,
            startsAt: b.startsAt.toISOString(),
            endsAt: b.endsAt.toISOString(),
            createdAt: b.createdAt.toISOString(),
            canceledAt: b.canceledAt ? b.canceledAt.toISOString() : null,
          }))}
          initialReminders={reminders.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
