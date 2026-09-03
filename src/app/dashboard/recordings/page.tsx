import { Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { RecordingsView } from "./recordings-view";

export const dynamic = "force-dynamic";

export default async function RecordingsPage() {
  await requireAccess("recordings");

  const [recordings, contacts] = await Promise.all([
    prisma.recording.findMany({
      include: { contact: { select: { id: true, companyName: true, contactName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Video className="h-6 w-6 text-[var(--hq-accent)]" />
          Recordings
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          One library for every recording — Loom-style screen shares, video
          uploads hosted elsewhere, or a link to a Twilio call recording from
          Comms. Paste a link, tag it, done. In-browser screen capture is a
          later step.
        </p>
      </div>

      <div className="mt-6">
        <RecordingsView
          initialRecordings={recordings.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
