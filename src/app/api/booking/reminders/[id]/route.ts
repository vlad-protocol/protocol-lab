import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can manage reminder rules." }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { enabled, minutesBefore, messageTemplate } = body as {
    enabled?: boolean;
    minutesBefore?: number;
    messageTemplate?: string;
  };
  const reminder = await prisma.bookingReminder.update({
    where: { id },
    data: {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(minutesBefore !== undefined ? { minutesBefore } : {}),
      ...(messageTemplate !== undefined ? { messageTemplate } : {}),
    },
  });
  return NextResponse.json({ reminder });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can manage reminder rules." }, { status: 403 });
  }
  const { id } = await params;
  await prisma.bookingReminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
