import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ISSUE_TAGS, STRENGTH_TAGS, isValidTag } from "@/lib/sales-coach-tags";

// Runs ONCE per call (on demand — the user clicks "Analyze", not
// automatically for every transcribed call) and caches the result on the
// Interaction row. That's the whole cost-control story here: one Claude
// call per call reviewed, ever, rather than re-deriving takeaways every
// time the chat is opened. Re-analyzing (same button, now "Re-analyze")
// overwrites the cached result — useful if the tag vocabulary changes or
// a transcript got corrected.
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

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
  const { interactionId } = body as { interactionId?: string };
  if (!interactionId) return NextResponse.json({ error: "No call selected." }, { status: 400 });

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: { contact: { select: { companyName: true, contactName: true, status: true } } },
  });
  if (!interaction || !interaction.transcript) {
    return NextResponse.json({ error: "This call doesn't have a transcript yet." }, { status: 404 });
  }

  const leadName = interaction.contact?.companyName || interaction.contact?.contactName || "this lead";
  const callKind = interaction.type === "CALL" ? "phone call" : "Zoom discovery call";

  const systemPrompt = `You are Vlad's sales coach, reviewing the transcript of a real ${callKind} he had with ${leadName}. The transcript is speaker-labeled but doesn't say which speaker is Vlad (the rep) vs. the lead — infer that from context.

Read the transcript and respond with ONLY a JSON object — no markdown fences, no commentary before or after — with exactly these keys:
{
  "notes": "A short, honest, specific write-up in plain prose (3-6 sentences). Reference actual moments from the call. No padding or generic praise.",
  "strengthTags": ["key", "key"],
  "issueTags": ["key", "key"]
}

strengthTags must be a subset of this list (use the exact keys, pick only ones that genuinely applied, can be empty):
${STRENGTH_TAGS.map((t) => `- ${t.key}: ${t.label}`).join("\n")}

issueTags must be a subset of this list (use the exact keys, pick only ones that genuinely applied, can be empty):
${ISSUE_TAGS.map((t) => `- ${t.key}: ${t.label}`).join("\n")}

Only tag something that's actually visible in the transcript — don't force a tag in just to fill the list.

Transcript:
---
${interaction.transcript}
---`;

  let parsed: { notes: string; strengthTags: string[]; issueTags: string[] };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: "user", content: "Analyze this call." }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Claude API error (${res.status}): ${(await res.text()).slice(0, 300)}`);
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
      { error: err instanceof Error ? err.message : "Failed to analyze this call." },
      { status: 502 }
    );
  }

  const strengthTags = (parsed.strengthTags || []).filter((k) => isValidTag(STRENGTH_TAGS, k));
  const issueTags = (parsed.issueTags || []).filter((k) => isValidTag(ISSUE_TAGS, k));

  const updated = await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      coachingNotes: parsed.notes || null,
      coachingStrengthTags: strengthTags,
      coachingIssueTags: issueTags,
      coachingGeneratedAt: new Date(),
    },
  });

  return NextResponse.json({
    coachingNotes: updated.coachingNotes,
    coachingStrengthTags: updated.coachingStrengthTags,
    coachingIssueTags: updated.coachingIssueTags,
    coachingGeneratedAt: updated.coachingGeneratedAt?.toISOString() || null,
  });
}
