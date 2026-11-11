import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicBookingIndexPage() {
  const eventTypes = await prisma.bookingEventType.findMany({
    where: { active: true },
    include: { host: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900">
        <CalendarClock className="h-6 w-6" />
        Book a time
      </h1>
      <p className="mt-1 text-sm text-neutral-500">Choose what you&apos;d like to book.</p>

      <div className="mt-6 space-y-3">
        {eventTypes.map((et) => (
          <Link
            key={et.id}
            href={"/book/" + et.slug}
            className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300"
          >
            <p className="font-medium text-neutral-900">{et.name}</p>
            {et.description && <p className="mt-1 text-sm text-neutral-500">{et.description}</p>}
            <p className="mt-1 text-xs text-neutral-400">
              {et.durationMinutes} min with {et.host.name || et.host.email}
            </p>
          </Link>
        ))}
        {eventTypes.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
            No booking links are open right now.
          </p>
        )}
      </div>
    </div>
  );
}
