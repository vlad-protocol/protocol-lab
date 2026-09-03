import { Calendar as CalendarIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireAccess("calendar");

  const [events, contacts] = await Promise.all([
    prisma.calendarEvent.findMany({
      include: { contact: { select: { id: true, companyName: true, contactName: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.contact.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <CalendarIcon className="h-6 w-6 text-[var(--hq-accent)]" />
          Calendar
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Everything on the books, upcoming first. This is a shared calendar
          inside the dashboard — Google Calendar sync is the natural next
          step once you want events to show up there too.
        </p>
      </div>

      <div className="mt-6">
        <CalendarView
          initialEvents={events.map((e) => ({
            ...e,
            startsAt: e.startsAt.toISOString(),
            endsAt: e.endsAt.toISOString(),
          }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
