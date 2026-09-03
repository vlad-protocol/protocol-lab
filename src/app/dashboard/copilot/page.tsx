import { Bot } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { CopilotView } from "./copilot-view";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  await requireAccess("copilot");

  const [notes, contacts] = await Promise.all([
    prisma.meetingNote.findMany({
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
          <Bot className="h-6 w-6 text-[var(--hq-accent)]" />
          Copilot
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Meeting and call notes in one shape: paste a transcript, write up
          the summary, decisions, and action items. Live auto-transcription
          is the natural next step once a speech-to-text key is connected —
          this is the structured half of that, working today.
        </p>
      </div>

      <div className="mt-6">
        <CopilotView
          initialNotes={notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
