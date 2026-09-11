import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hit when a recipient clicks a link in a campaign email. Records the
// click, then redirects on to the real destination — the recipient never
// sees this URL, it just adds one instant hop.
export async function GET(req: Request, { params }: { params: Promise<{ sendId: string }> }) {
  const { sendId } = await params;
  const target = new URL(req.url).searchParams.get("u");

  if (!target || !/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: "Missing or invalid target URL." }, { status: 400 });
  }

  try {
    const send = await prisma.emailSend.findUnique({ where: { id: sendId }, select: { openedAt: true, firstClickedAt: true } });
    if (send) {
      const now = new Date();
      await prisma.emailSend.update({
        where: { id: sendId },
        data: {
          openedAt: send.openedAt ?? now,
          firstClickedAt: send.firstClickedAt ?? now,
          lastClickedAt: now,
          clickCount: { increment: 1 },
        },
      });
    }
  } catch {
    // Never block the redirect on a tracking-write failure.
  }

  return NextResponse.redirect(target, { status: 302 });
}
