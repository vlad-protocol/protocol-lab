import { prisma } from "@/lib/prisma";
import { isSesConfigured, sendSesEmail } from "@/lib/integrations/ses";
import { sendSms } from "@/lib/integrations/twilio";

// Fires any due "N minutes before the meeting" reminder for every
// upcoming confirmed booking — this is specifically what increases
// show-up rate: Vlad's own ask was "24 hours ahead... so I can make sure
// they do come for the call." Runs from the same background tick as
// everything else (see instrumentation.ts), checked every 2 minutes, so
// a reminder set for "24h before" actually fires within a couple of
// minutes of that mark, not exactly on it — fine for a reminder, not
// something that needs second-level precision.
//
// BookingReminderLog is the de-dupe: a (bookingId, reminderId) pair is
// unique, so a reminder that already fired for a booking is skipped on
// every later tick rather than re-sent.

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendDueBookingReminders() {
  const reminders = await prisma.bookingReminder.findMany({ where: { enabled: true } });
  if (reminders.length === 0) return [];

  const now = Date.now();
  const results: { bookingId: string; reminderId: string; error?: string }[] = [];

  for (const reminder of reminders) {
    // A booking is due for THIS reminder if its start time is within the
    // reminder's window right now (between "due" and 10 minutes ago, so
    // a tick that's briefly delayed doesn't skip it entirely) and still
    // in the future (never fire a "reminder" for a meeting that already
    // happened or was canceled).
    const windowStart = new Date(now + reminder.minutesBefore * 60 * 1000 - 10 * 60 * 1000);
    const windowEnd = new Date(now + reminder.minutesBefore * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: windowStart, lte: windowEnd },
        ...(reminder.eventTypeId ? { eventTypeId: reminder.eventTypeId } : {}),
        remindersSent: { none: { reminderId: reminder.id } },
      },
      include: { eventType: true, host: { select: { name: true, email: true } } },
    });

    for (const booking of bookings) {
      const vars = {
        name: booking.name,
        host: booking.host.name || booking.host.email,
        eventName: booking.eventType.name,
        time: booking.startsAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" }),
        location: booking.eventType.location || "",
      };
      const message = renderTemplate(reminder.messageTemplate, vars);

      try {
        if (reminder.channel === "EMAIL") {
          if (!isSesConfigured()) throw new Error("Email isn't configured (SES).");
          await sendSesEmail(booking.email, `Reminder: ${booking.eventType.name}`, `<p>${message.replace(/\n/g, "<br/>")}</p>`, message);
        } else {
          if (!booking.phone) throw new Error("This booking has no phone number on file.");
          await sendSms(booking.phone, message);
        }
        await prisma.bookingReminderLog.create({ data: { bookingId: booking.id, reminderId: reminder.id } });
        results.push({ bookingId: booking.id, reminderId: reminder.id });
      } catch (err) {
        // Still log it as "sent" so a persistently-failing reminder
        // (bad phone number, SES not configured) doesn't get retried
        // every 2 minutes forever — the error is surfaced in results for
        // the background tick's console.error instead.
        await prisma.bookingReminderLog.create({ data: { bookingId: booking.id, reminderId: reminder.id } }).catch(() => {});
        results.push({ bookingId: booking.id, reminderId: reminder.id, error: err instanceof Error ? err.message : "failed" });
      }
    }
  }

  return results;
}
