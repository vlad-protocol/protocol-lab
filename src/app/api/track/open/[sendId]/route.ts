import { prisma } from "@/lib/prisma";
import { TRANSPARENT_PIXEL_GIF } from "@/lib/email-tracking";

// Hit by the recipient's email client loading the tracking pixel — no
// auth, since it's not the recipient signing in, just an <img> request.
// Always returns the pixel even if the send id doesn't match anything,
// so a stale/forwarded email never shows a broken image.
export async function GET(_req: Request, { params }: { params: Promise<{ sendId: string }> }) {
  const { sendId } = await params;
  try {
    await prisma.emailSend.updateMany({
      where: { id: sendId, openedAt: null },
      data: { openedAt: new Date() },
    });
  } catch {
    // ignore — never fail the pixel response
  }
  return new Response(TRANSPARENT_PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
