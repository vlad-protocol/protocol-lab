import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookFlow } from "./book-flow";

export const dynamic = "force-dynamic";

export default async function PublicBookingSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const eventType = await prisma.bookingEventType.findUnique({
    where: { slug },
    include: { questions: { orderBy: { order: "asc" } }, host: { select: { name: true, email: true } } },
  });
  if (!eventType || !eventType.active) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-16">
      <BookFlow
        eventType={{
          slug: eventType.slug,
          name: eventType.name,
          description: eventType.description,
          durationMinutes: eventType.durationMinutes,
          location: eventType.location,
          hostName: eventType.host.name || eventType.host.email,
          questions: eventType.questions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options,
          })),
        }}
      />
    </div>
  );
}
