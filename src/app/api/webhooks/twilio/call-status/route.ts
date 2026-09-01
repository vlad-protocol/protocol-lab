import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const form = await req.formData();
  const callSid = form.get("CallSid") as string | null;
  const status = form.get("CallStatus") as string | null;
  const duration = form.get("CallDuration") as string | null;
  if (!callSid) return NextResponse.json({ ok: true });

  const interaction = await prisma.interaction.findFirst({ where: { externalId: callSid } });
  if (interaction) {
    await prisma.interaction.update({
      where: { id: interaction.id },
      data: {
        durationSeconds: duration ? parseInt(duration, 10) : undefined,
        body: `Call ${status || "completed"}.`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
