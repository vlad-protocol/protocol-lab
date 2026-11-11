import { NextResponse } from "next/server";
import { getEventTypeBySlug, createBooking } from "@/lib/booking";

// Public — no auth. Submits the qualification answers + chosen slot +
// contact info and books it instantly.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const eventType = await getEventTypeBySlug(slug);
  if (!eventType || !eventType.active) {
    return NextResponse.json({ error: "This booking link isn't available." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, startsAt, answers } = body as {
    name?: string;
    email?: string;
    phone?: string;
    startsAt?: string;
    answers?: Record<string, string | string[]>;
  };

  if (!name?.trim() || !email?.trim() || !startsAt) {
    return NextResponse.json({ error: "Name, email, and a time are required." }, { status: 400 });
  }
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  }

  const answerList: { questionId: string; answer: string }[] = [];
  for (const q of eventType.questions) {
    const raw = answers?.[q.id];
    const value = Array.isArray(raw) ? raw.join(", ") : raw;
    if (q.required && !value) {
      return NextResponse.json({ error: `"${q.label}" is required.` }, { status: 400 });
    }
    if (value) answerList.push({ questionId: q.id, answer: value });
  }

  try {
    const booking = await createBooking({
      eventType,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || undefined,
      startsAt: startDate,
      answers: answerList,
    });
    return NextResponse.json({
      booking: { id: booking.id, startsAt: booking.startsAt.toISOString(), endsAt: booking.endsAt.toISOString() },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't book that time." }, { status: 409 });
  }
}
