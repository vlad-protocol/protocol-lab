import { prisma } from "@/lib/prisma";
import type { Booking, BookingEventType, BookingQuestion } from "@prisma/client";
import { getBusyIntervals, createCalendarEvent, deleteCalendarEvent, isGoogleCalendarConnected } from "@/lib/integrations/google-calendar";
import { isSesConfigured, sendSesEmail } from "@/lib/integrations/ses";

// The whole booking engine for one public link (BookingEventType):
// combine the host's weekly Availability windows with what's already on
// their calendar (this app's own Bookings +, if connected, their real
// Google Calendar) to produce real open slots, then book one instantly —
// no manual confirm step, matching how Calendly itself behaves.

const DAY_MS = 24 * 60 * 60 * 1000;

type Interval = { start: Date; end: Date };

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// All slot math is done in the host's own local time zone, not the
// server's or the visitor's — a rep's "9am-5pm" means 9am-5pm where they
// actually are. Falls back to the app's default if a host hasn't set one
// (see Settings — most of this app already assumes Eastern/Montreal).
const DEFAULT_TIME_ZONE = "America/Toronto";

function zonedDayOfWeekAndMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekdayStr = parts.find((p) => p.type === "weekday")!.value;
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayOfWeek: DAY_INDEX[weekdayStr], minutesIntoDay: hour * 60 + minute };
}

export async function getEventTypeBySlug(slug: string) {
  return prisma.bookingEventType.findUnique({
    where: { slug },
    include: { questions: { orderBy: { order: "asc" } }, host: { select: { id: true, name: true, email: true } } },
  });
}

// Returns available slot start times (as ISO strings), grouped by host
// local calendar date ("YYYY-MM-DD"), for the next `days` days starting
// today.
export async function getAvailableSlots(
  eventType: BookingEventType,
  days = 21,
  timeZone: string = DEFAULT_TIME_ZONE
): Promise<{ date: string; times: string[] }[]> {
  const now = new Date();
  const rangeStart = now;
  const rangeEnd = new Date(now.getTime() + days * DAY_MS);

  const windows = await prisma.availability.findMany({ where: { hostUserId: eventType.hostUserId } });
  if (windows.length === 0) return [];

  const earliestBookable = new Date(now.getTime() + eventType.minNoticeHours * 60 * 60 * 1000);

  const [existingBookings, connected] = await Promise.all([
    prisma.booking.findMany({
      where: { hostUserId: eventType.hostUserId, status: "CONFIRMED", startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { startsAt: true, endsAt: true },
    }),
    isGoogleCalendarConnected(eventType.hostUserId),
  ]);

  const busy: Interval[] = existingBookings.map((b) => ({ start: b.startsAt, end: b.endsAt }));

  if (connected) {
    try {
      const googleBusy = await getBusyIntervals(eventType.hostUserId, rangeStart, rangeEnd);
      busy.push(...googleBusy);
    } catch {
      // Token expired/revoked, or the rep hasn't actually reconnected
      // since Calendar scopes were added — degrade to in-app-only
      // conflict checking rather than failing the whole booking page.
    }
  }

  const bufferMs = eventType.bufferBeforeMinutes * 60 * 1000;
  const bufferMsAfter = eventType.bufferAfterMinutes * 60 * 1000;
  const durationMs = eventType.durationMinutes * 60 * 1000;
  const stepMinutes = 15; // slot grid granularity, same as Calendly's default

  const byDate = new Map<string, string[]>();

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const dayStart = new Date(rangeStart.getTime() + dayOffset * DAY_MS);
    const { dayOfWeek } = zonedDayOfWeekAndMinutes(dayStart, timeZone);
    const dayWindows = windows.filter((w) => w.dayOfWeek === dayOfWeek);
    if (dayWindows.length === 0) continue;

    // The calendar date (in the host's time zone) this dayOffset actually
    // lands on — used both to key the result and to anchor window times.
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(dayStart);

    let dayBookedCount = 0;
    if (eventType.dailyLimit != null) {
      dayBookedCount = existingBookings.filter((b) => {
        const d = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(b.startsAt);
        return d === dateKey;
      }).length;
    }
    if (eventType.dailyLimit != null && dayBookedCount >= eventType.dailyLimit) continue;

    const slots: string[] = [];
    for (const w of dayWindows) {
      const startMin = timeToMinutes(w.startTime);
      const endMin = timeToMinutes(w.endTime);
      for (let m = startMin; m + eventType.durationMinutes <= endMin; m += stepMinutes) {
        // Build the actual instant for "dateKey at m minutes into the
        // day, in `timeZone`" by constructing a UTC guess then correcting
        // for the zone's offset at that instant (handles DST correctly
        // since we re-derive the offset from the guess itself).
        const [y, mo, d] = dateKey.split("-").map(Number);
        const utcGuess = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) + m * 60 * 1000);
        const { minutesIntoDay: guessedMinutes } = zonedDayOfWeekAndMinutes(utcGuess, timeZone);
        const offsetMinutes = guessedMinutes - m;
        const slotStart = new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        if (slotStart < earliestBookable) continue;
        const bufferedSlot: Interval = {
          start: new Date(slotStart.getTime() - bufferMs),
          end: new Date(slotEnd.getTime() + bufferMsAfter),
        };
        if (busy.some((b) => overlaps(bufferedSlot, b))) continue;

        slots.push(slotStart.toISOString());
      }
    }
    if (slots.length > 0) byDate.set(dateKey, slots);
  }

  return [...byDate.entries()].map(([date, times]) => ({ date, times }));
}

export type BookingAnswerInput = { questionId: string; answer: string };

export async function createBooking(params: {
  eventType: BookingEventType & { questions: BookingQuestion[] };
  name: string;
  email: string;
  phone?: string;
  startsAt: Date;
  answers: BookingAnswerInput[];
}): Promise<Booking> {
  const { eventType, name, email, phone, startsAt, answers } = params;
  const endsAt = new Date(startsAt.getTime() + eventType.durationMinutes * 60 * 1000);

  // Re-check for a conflict right before committing — the slot list the
  // visitor saw could be a minute or two stale (another visitor booked
  // it, or the rep put something on their calendar directly) between
  // loading the page and submitting.
  const bufferStart = new Date(startsAt.getTime() - eventType.bufferBeforeMinutes * 60 * 1000);
  const bufferEnd = new Date(endsAt.getTime() + eventType.bufferAfterMinutes * 60 * 1000);
  const conflict = await prisma.booking.findFirst({
    where: {
      hostUserId: eventType.hostUserId,
      status: "CONFIRMED",
      startsAt: { lt: bufferEnd },
      endsAt: { gt: bufferStart },
    },
  });
  if (conflict) {
    throw new Error("That time was just booked by someone else — pick another slot.");
  }
  if (await isGoogleCalendarConnected(eventType.hostUserId)) {
    try {
      const googleBusy = await getBusyIntervals(eventType.hostUserId, bufferStart, bufferEnd);
      if (googleBusy.some((b) => overlaps({ start: bufferStart, end: bufferEnd }, b))) {
        throw new Error("That time was just booked by someone else — pick another slot.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("That time")) throw err;
      // Can't reach Google right now — fall through to the in-app check
      // above rather than blocking every booking on a flaky API call.
    }
  }

  // Find-or-create the lead this booking belongs to, same as every other
  // inbound channel (email reply, Twilio call) — a booking is a touch,
  // and the rep should see it on the lead's own Communication Log.
  let contact = await prisma.contact.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        contactName: name,
        email,
        phone: phone || null,
        source: `Booking page (${eventType.name})`,
        createdById: eventType.hostUserId,
      },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      eventTypeId: eventType.id,
      hostUserId: eventType.hostUserId,
      name,
      email,
      phone: phone || null,
      startsAt,
      endsAt,
      contactId: contact.id,
      answers: {
        create: answers.map((a) => {
          const q = eventType.questions.find((qq) => qq.id === a.questionId);
          return { questionId: a.questionId, label: q?.label || "Question", answer: a.answer };
        }),
      },
    },
  });

  // Log it on the lead's timeline right away — don't make Vlad/the rep
  // wait for the actual call to happen before it shows up anywhere.
  await prisma.interaction.create({
    data: {
      contactId: contact.id,
      type: "NOTE",
      direction: "INBOUND",
      body: `Booked "${eventType.name}" for ${startsAt.toLocaleString()} via the booking page.`,
      occurredAt: new Date(),
      userId: eventType.hostUserId,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: `${eventType.name} — ${name}`,
      startsAt,
      endsAt,
      location: eventType.location || undefined,
      notes: answers.length > 0 ? answers.map((a) => `${a.questionId}: ${a.answer}`).join("\n") : undefined,
      contactId: contact.id,
      createdById: eventType.hostUserId,
    },
  });

  let googleEventId: string | null = null;
  if (await isGoogleCalendarConnected(eventType.hostUserId)) {
    try {
      googleEventId = await createCalendarEvent(eventType.hostUserId, {
        summary: `${eventType.name} — ${name}`,
        description: eventType.description || undefined,
        location: eventType.location || undefined,
        startsAt,
        endsAt,
        attendeeEmail: email,
      });
      await prisma.booking.update({ where: { id: booking.id }, data: { googleEventId } });
    } catch {
      // Booking still succeeds without calendar sync — the rep sees it
      // in the dashboard's booking list either way.
    }
  }

  await sendBookingConfirmationEmail(booking, eventType).catch(() => {});

  return booking;
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status === "CANCELED") return booking;

  if (booking.googleEventId) {
    await deleteCalendarEvent(booking.hostUserId, booking.googleEventId).catch(() => {});
  }

  await prisma.calendarEvent.deleteMany({
    where: { contactId: booking.contactId, startsAt: booking.startsAt, endsAt: booking.endsAt },
  });

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELED", canceledAt: new Date(), cancelReason: reason || null },
  });
}

async function sendBookingConfirmationEmail(booking: Booking, eventType: BookingEventType) {
  if (!isSesConfigured()) return;
  const when = booking.startsAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const html = `<p>You're booked for <strong>${eventType.name}</strong> on <strong>${when}</strong>.</p>${
    eventType.location ? `<p>${eventType.location}</p>` : ""
  }<p>Need to change anything? Just reply to this email.</p>`;
  await sendSesEmail(booking.email, `Confirmed: ${eventType.name}`, html, `You're booked for ${eventType.name} on ${when}.`);
}
