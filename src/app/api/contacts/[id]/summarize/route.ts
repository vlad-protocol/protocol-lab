import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Same Claude call pattern as /api/cfo/chat — see that route for the
// reasoning behind fetch-over-SDK and the env vars.
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_crm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI summaries aren't set up yet — add an ANTHROPIC_API_KEY environment variable in Railway (Project → Variables), then redeploy.",
      },
      { status: 501 }
    );
  }

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      interactions: {
        where: { type: "EMAIL" },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  if (contact.interactions.length === 0) {
    return NextResponse.json({ error: "No email history with this lead yet to summarize." }, { status: 400 });
  }

  const transcript = contact.interactions
    .map((i) => {
      const who = i.direction === "INBOUND" ? "Them" : "Us";
      const when = new Date(i.occurredAt).toLocaleDateString();
      const subject = i.subject ? `Subject: ${i.subject}\n` : "";
      return `[${who} · ${when}]\n${subject}${i.body || "(no body)"}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are a sales assistant summarizing an email conversation between a company and a lead named ${contact.contactName}${
    contact.companyName ? ` at ${contact.companyName}` : ""
  }. Current CRM status: ${contact.status}.

Read the full email thread below and respond with ONLY a JSON object — no markdown code fences, no commentary before or after — with exactly these keys:
{
  "summary": "2-3 sentence plain-English summary of where the conversation currently stands",
  "nextStep": "one concrete, specific suggested next action for the rep to take",
  "followUpWeeks": 1
}
followUpWeeks must be exactly one of: 0, 1, 2, or 3. Use 0 only if no further follow-up is needed (the lead converted, closed, or explicitly asked not to be contacted again). Otherwise pick 1 for a hot/engaged lead that should be followed up with soon, 2 for a normal-pace lead, or 3 for a cold or low-priority one.`;

  let parsed: { summary: string; nextStep: string; followUpWeeks: number };
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
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: transcript.slice(0, 15000) }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errText.slice(0, 300)}`);
    }
    const json = await res.json();
    const text: string = json.content?.[0]?.text || "";
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate a summary." },
      { status: 502 }
    );
  }

  const weeks = [0, 1, 2, 3].includes(parsed.followUpWeeks) ? parsed.followUpWeeks : 0;
  const nextFollowUpDate = weeks > 0 ? new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000) : null;

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      lastConversationSummary: parsed.summary,
      nextStep: parsed.nextStep,
      nextFollowUpDate,
      summaryGeneratedAt: new Date(),
    },
  });

  return NextResponse.json({ contact: updated });
}
