import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// Check-ins are personal — every user (owner or employee) tracks their own
// adherence to the schedule, so this only ever reads/writes the caller's
// own rows, scoped by module access rather than role.

function mondayOf(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "training")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const weekOfParam = searchParams.get("weekOf") || new Date().toISOString();
  const weekOf = mondayOf(weekOfParam);

  const checkIns = await prisma.trainingCheckIn.findMany({
    where: { userId: session.user.id, weekOf },
  });

  return NextResponse.json({ weekOf: weekOf.toISOString(), checkIns });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "training")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { dayKey, weekOf: weekOfParam, done } = body as {
    dayKey?: string;
    weekOf?: string;
    done?: boolean;
  };
  if (!dayKey || !weekOfParam) {
    return NextResponse.json({ error: "dayKey and weekOf are required." }, { status: 400 });
  }
  const weekOf = mondayOf(weekOfParam);

  if (done === false) {
    await prisma.trainingCheckIn.deleteMany({
      where: { userId: session.user.id, dayKey, weekOf },
    });
    return NextResponse.json({ ok: true });
  }

  const checkIn = await prisma.trainingCheckIn.upsert({
    where: { userId_dayKey_weekOf: { userId: session.user.id, dayKey, weekOf } },
    update: { done: true },
    create: { userId: session.user.id, dayKey, weekOf, done: true },
  });

  return NextResponse.json({ checkIn });
}
