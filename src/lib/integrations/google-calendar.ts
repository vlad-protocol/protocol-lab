import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getClientForUser } from "@/lib/integrations/gmail";

// Booking's Google Calendar sync reuses the SAME OAuth connection as
// Gmail (see gmail.ts — one "Connect Google" button, one stored token,
// scoped for both Gmail send/modify and Calendar events/freebusy) rather
// than running a second OAuth flow and needing a second Google Cloud
// redirect URI registered. A rep who connected Gmail before this feature
// shipped needs to reconnect once to pick up the added Calendar scopes —
// isGoogleCalendarConnected() below is the best-effort check for that.

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  return !!conn;
}

async function getCalendarClientForUser(userId: string) {
  const client = await getClientForUser(userId);
  return google.calendar({ version: "v3", auth: client });
}

export type BusyInterval = { start: Date; end: Date };

// Pulls the rep's real calendar conflicts for a date range — this is
// what keeps the booking page from offering a slot the rep is actually
// busy in (a meeting they put on their calendar directly, not through
// this app). If the rep hasn't connected Google Calendar, callers treat
// this as "no external conflicts known" and fall back to only checking
// this app's own Availability windows + existing Bookings.
export async function getBusyIntervals(userId: string, timeMin: Date, timeMax: Date): Promise<BusyInterval[]> {
  const calendar = await getCalendarClientForUser(userId);
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });
  const busy = res.data.calendars?.primary?.busy || [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({ start: new Date(b.start as string), end: new Date(b.end as string) }));
}

// Writes a confirmed booking straight into the rep's own Google Calendar
// — this is the "so they can open Google Calendar and see what meetings
// they have coming up" part. Returns the Google event id so a later
// cancellation can remove it there too.
export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startsAt: Date;
    endsAt: Date;
    attendeeEmail?: string;
  }
): Promise<string> {
  const calendar = await getCalendarClientForUser(userId);
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startsAt.toISOString() },
      end: { dateTime: event.endsAt.toISOString() },
      attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
    },
    // Google sends its own invite email to the attendee — not something
    // this app needs to replicate with its own "you're booked" email,
    // though we still send a confirmation (see lib/booking.ts) since the
    // rep might not have Calendar connected at all.
    sendUpdates: "all",
  });
  return res.data.id as string;
}

export async function deleteCalendarEvent(userId: string, googleEventId: string): Promise<void> {
  const calendar = await getCalendarClientForUser(userId);
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId, sendUpdates: "all" });
  } catch (err) {
    // Already deleted directly in Google Calendar, or the connection was
    // revoked since — either way there's nothing left to clean up here,
    // and failing the whole cancellation over this would be worse than
    // a harmless orphaned Google event.
    const code = (err as { code?: number })?.code;
    if (code !== 404 && code !== 410) throw err;
  }
}
