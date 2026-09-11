import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Same Claude call pattern as /api/contacts/[id]/summarize.
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

// Drafts a ready-to-send follow-up email for this lead, grounded in the
// actual email history on file — not a generic template. Used both for
// "reply to this specific message" (pass replyingTo) and for a
// standalone follow-up with no particular message in hand.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
          "AI drafting isn't set up yet — add an ANTHROPIC_API_KEY environment variable in Railway (Project → Variables), then redeploy.",
      },
      { status: 501 }
    );
  }

  const { replyingTo, instructions } = (await req.json().catch(() => ({}))) as {
    replyingTo?: { from: string; subject: string; body: string; date: string } | null;
    instructions?: string;
  };

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { interactions: { where: { type: "EMAIL" }, orderBy: { occurredAt: "asc" } } },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  const transcript = contact.interactions
    .map((i) => {
      const who = i.direction === "INBOUND" ? "Them" : "Us";
      const when = new Date(i.occurredAt).toLocaleDateString();
      const subject = i.subject ? `Subject: ${i.subject}\n` : "";
      return `[${who} · ${when}]\n${subject}${i.body || "(no body)"}`;
    })
    .join("\n\n---\n\n");

  const lastContactedNote = contact.lastContactDate
    ? `Last contacted ${new Date(contact.lastContactDate).toLocaleDateString()}.`
    : "No prior contact date on file.";

  const systemPrompt = `You are a sales rep drafting a follow-up email to a lead named ${contact.contactName}${
    contact.companyName ? ` at ${contact.companyName}` : ""
  }. Current CRM status: ${contact.status}. ${lastContactedNote}

${
  replyingTo
    ? `You are replying directly to this specific email they sent:\nFrom: ${replyingTo.from}\nDate: ${replyingTo.date}\nSubject: ${replyingTo.subject}\n\n${replyingTo.body}\n\nThe full email history below is background context.`
    : "There's no single specific email being replied to — this is a general follow-up. Use the full history below for context and pick the most natural next thing to say."
}

${instructions ? `The rep's specific instruction for this draft: ${instructions}\n` : ""}
Full email history with this lead so far:
${transcript.slice(0, 12000) || "(no email history yet — this would be a cold first outreach)"}

Write a short, natural, specific follow-up — reference something real from the conversation, not generic sales language. One clear next step or question. No corporate filler, no "I hope this email finds you well." Sign off simply.

Respond with ONLY a JSON object — no markdown code fences, no commentary — with exactly these keys:
{
  "subject": "the email subject line",
  "body": "the full email body, plain text, ready to send as-is"
}`;

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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: "Draft the follow-up email now." }],
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
    const parsed = JSON.parse(cleaned) as { subject: string; body: string };
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to draft a follow-up." },
      { status: 502 }
    );
  }
}
