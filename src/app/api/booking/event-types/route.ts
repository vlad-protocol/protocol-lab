import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const QUESTION_TYPES = new Set(["TEXT", "TEXTAREA", "RADIO", "CHECKBOX", "DROPDOWN", "PHONE"]);

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type QuestionInput = {
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

// Lists this user's own booking links. An OWNER additionally sees every
// rep's links (read-only for anyone else's) so Vlad can see what the
// whole team has published without having to ask each rep.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");

  const eventTypes = await prisma.bookingEventType.findMany({
    where: scope === "all" && session.user.role === "OWNER" ? {} : { hostUserId: session.user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      host: { select: { id: true, name: true, email: true } },
      _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ eventTypes });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    name,
    description,
    durationMinutes,
    requiresQuestions,
    questions,
    location,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    minNoticeHours,
    dailyLimit,
  } = body as {
    name?: string;
    description?: string;
    durationMinutes?: number;
    requiresQuestions?: boolean;
    questions?: QuestionInput[];
    location?: string;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    minNoticeHours?: number;
    dailyLimit?: number | null;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  for (const q of questions || []) {
    if (!q.label || !q.label.trim()) {
      return NextResponse.json({ error: "Every question needs a label." }, { status: 400 });
    }
    if (!QUESTION_TYPES.has(q.type)) {
      return NextResponse.json({ error: `Invalid question type: ${q.type}` }, { status: 400 });
    }
  }

  // Make the slug unique by appending a short suffix on collision rather
  // than erroring — two reps both naming a link "Discovery Call" is a
  // completely normal thing to happen.
  const base = slugify(name) || "event";
  let slug = base;
  let suffix = 1;
  while (await prisma.bookingEventType.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${base}-${suffix}`;
  }

  const eventType = await prisma.bookingEventType.create({
    data: {
      slug,
      name: name.trim(),
      description: description || null,
      hostUserId: session.user.id,
      durationMinutes: durationMinutes || 30,
      requiresQuestions: !!requiresQuestions,
      location: location || null,
      bufferBeforeMinutes: bufferBeforeMinutes || 0,
      bufferAfterMinutes: bufferAfterMinutes || 0,
      minNoticeHours: minNoticeHours ?? 2,
      dailyLimit: dailyLimit ?? null,
      questions: {
        create: (questions || []).map((q, i) => ({
          label: q.label.trim(),
          type: q.type as never,
          required: q.required ?? true,
          options: q.options || [],
          order: i,
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ eventType });
}
