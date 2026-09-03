import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { BookingView } from "./booking-view";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  await requireAccess("booking");

  const [availabilities, requests] = await Promise.all([
    prisma.availability.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.bookingRequest.findMany({ orderBy: { requestedAt: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <CalendarClock className="h-6 w-6 text-[var(--hq-accent)]" />
          Booking
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Set your weekly availability, then share your public booking page —{" "}
          <code className="rounded bg-[var(--hq-canvas)] px-1.5 py-0.5 text-xs">/book</code> —
          so people can request a time. Confirm or decline each request below.
        </p>
      </div>

      <div className="mt-6">
        <BookingView
          initialAvailabilities={availabilities}
          initialRequests={requests.map((r) => ({ ...r, requestedAt: r.requestedAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
