import { prisma } from "@/lib/prisma";
import { BookForm } from "./book-form";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage() {
  const availabilities = await prisma.availability.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">Book a time</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick a slot within the windows below and send a request — you&apos;ll get a
        confirmation once it&apos;s accepted.
      </p>
      <div className="mt-6">
        <BookForm availabilities={availabilities} />
      </div>
    </div>
  );
}
