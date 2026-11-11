import { NextResponse } from "next/server";
import { getEventTypeBySlug, getAvailableSlots } from "@/lib/booking";

// Public — no auth. The booking page itself calls this to render the
// date/time picker.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const eventType = await getEventTypeBySlug(slug);
  if (!eventType || !eventType.active) {
    return NextResponse.json({ error: "This booking link isn't available." }, { status: 404 });
  }
  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get("days")) || 21, 60);
  const timeZone = url.searchParams.get("tz") || undefined;

  const days_ = await getAvailableSlots(eventType, days, timeZone);
  return NextResponse.json({
    eventType: {
      name: eventType.name,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
      location: eventType.location,
      requiresQuestions: eventType.requiresQuestions,
      questions: eventType.questions,
      host: eventType.host,
    },
    days: days_,
  });
}
