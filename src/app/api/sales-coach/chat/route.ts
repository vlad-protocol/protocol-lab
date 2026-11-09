import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Sales Coach chat — same pattern as /api/cfo/chat: the model is grounded
// in real data (here, one call's speaker-labeled transcript, fetched
// server-side rather than trusted from the client) instead of generic
// sales-coaching platitudes. Requires ANTHROPIC_API_KEY. Chat history
// itself isn't persisted — sent fresh with every request, same as CFO
// chat.
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "sales_coach")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Sales Coach isn't set up yet — add an ANTHROPIC_API_KEY environment variable in Railway (Project → Variables), then redeploy.",
      },
      { status: 501 }
    );
  }

  const body = await req.json();
  const { messages, interactionId } = body as { messages?: ChatMessage[]; interactionId?: string };
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 });
  }
  if (!interactionId) {
    return NextResponse.json({ error: "No call selected." }, { status: 400 });
  }

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: { contact: { select: { companyName: true, contactName: true, status: true } } },
  });
  if (!interaction || !interaction.transcript) {
    return NextResponse.json({ error: "This call doesn't have a transcript yet." }, { status: 404 });
  }

  const systemPrompt = buildSystemPrompt(interaction);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Sales Coach chat: Anthropic API error", res.status, errText);
      return NextResponse.json(
        { error: "The sales coach had trouble reaching Claude. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data?.content?.[0]?.type === "text" ? data.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Sales Coach chat: request failed", err);
    return NextResponse.json({ error: "The sales coach had trouble reaching Claude. Try again in a moment." }, { status: 502 });
  }
}

function buildSystemPrompt(interaction: {
  type: string;
  direction: string;
  occurredAt: Date;
  durationSeconds: number | null;
  transcript: string | null;
  contact: { companyName: string | null; contactName: string | null; status: string } | null;
}) {
  const leadName = interaction.contact?.companyName || interaction.contact?.contactName || "this lead";
  const callKind = interaction.type === "CALL" ? "phone call" : "Zoom discovery call";

  return `You are Vlad's sales coach/trainer — direct, specific, and focused on helping him close more deals and run better sales calls. You're reviewing the transcript of a real ${callKind} he had with ${leadName} on ${interaction.occurredAt.toLocaleDateString()}${
    interaction.durationSeconds ? ` (${Math.round(interaction.durationSeconds / 60)} min)` : ""
  }. Current CRM status of this lead: ${interaction.contact?.status || "unknown"}.

The transcript is speaker-labeled (e.g. "Speaker A" / "Speaker B") but it isn't told which speaker is Vlad vs. the lead — infer that from context (Vlad is the rep selling/pitching; the other speaker is the prospect). If the transcript was pasted from Zoom it may already be labeled with real names — use those if present.

Transcript:
---
${interaction.transcript}
---

Be concrete and reference specific moments/quotes from the call rather than generic sales advice. When asked what went well or wrong, give a short, honest, specific readout — don't hedge or pad it with praise he didn't earn. When asked to draft a follow-up, write something he could actually send, grounded in what was actually discussed. Keep responses focused and reasonably short unless he asks for more depth.`;
}
