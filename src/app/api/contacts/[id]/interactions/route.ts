import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

// Manual interaction logging — a call you made from your own phone, a text
// you sent from somewhere else, or a plain note. Emails sent through the
// Mail module and texts sent through Comms log themselves via those
// routes instead; this is the "log it yourself" fallback.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { type, direction, subject, body: text, durationSeconds, recordingUrl, occurredAt } =
    body as {
      type?: string;
      direction?: string;
      subject?: string;
      body?: string;
      durationSeconds?: number;
      recordingUrl?: string;
      occurredAt?: string;
    };

  if (!type || !direction) {
    return NextResponse.json({ error: "type and direction are required." }, { status: 400 });
  }

  const interaction = await prisma.interaction.create({
    data: {
      contactId: id,
      userId: session.user.id,
      type: type as "EMAIL" | "CALL" | "TEXT" | "NOTE",
      direction: direction as "INBOUND" | "OUTBOUND",
      subject: subject || null,
      body: text || null,
      durationSeconds: durationSeconds ?? null,
      recordingUrl: recordingUrl || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
  });

  return NextResponse.json({ interaction });
}
