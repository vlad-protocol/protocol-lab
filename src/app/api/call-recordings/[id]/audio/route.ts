import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Serves a locally-recorded call's audio bytes back out — for the
// <audio>/<a> "Play recording" link on a lead's timeline. Unlike
// /api/uploads/[id] (public, since it's embedded in emails sent to
// outsiders), this is a real recorded conversation, so it stays behind
// the same session auth as the rest of the CRM.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const recording = await prisma.callRecording.findUnique({ where: { id } });
  if (!recording) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(recording.data), {
    status: 200,
    headers: {
      "Content-Type": recording.contentType,
      "Content-Length": String(recording.size),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
