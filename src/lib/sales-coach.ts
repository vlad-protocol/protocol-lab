// Shared by /api/sales-coach/analyze (user clicks "Analyze"/"Re-analyze")
// and the automatic trigger in lib/call-transcription.ts (fires once a
// recorded call's transcript finishes, so a reviewed takeaway is waiting
// without Vlad having to ask for it). One Claude call per interaction,
// cached on the row — see the longer rationale in the analyze route.
//
// Coaches a cold call and a discovery/video call differently, because
// they have different jobs per the Protocol Sales Playbook: a cold
// call's only goal is to get the video call booked; the video call's
// job is to close. Asking "why didn't you close" on a cold call, or
// "why didn't you book a next step" on a call whose next step IS the
// close, would be coaching against the wrong goal.
import { prisma } from "@/lib/prisma";
import {
  type CallKind,
  issueTagsFor,
  strengthTagsFor,
  isValidTag,
} from "@/lib/sales-coach-tags";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

function promptFor(kind: CallKind, leadName: string, transcript: string): string {
  const issueTags = issueTagsFor(kind);
  const strengthTags = strengthTagsFor(kind);

  const goalBlock =
    kind === "CALL"
      ? `This is a COLD CALL. Its only goal is to get ${leadName} booked on a video call — it is NOT supposed to close the deal. Judge Vlad against that goal: did he get past any gatekeeper, build enough rapport/intrigue, handle objections just enough to keep the door open, and lock in a firm date/time for the video call? Don't ding him for "not closing" or "not asking for the sale" — that's not this call's job. Do ding him if he tried to sell the whole thing on the phone instead of booking the video call, or if he got a soft "maybe" instead of a real booked time.`
      : `This is a DISCOVERY / VIDEO CALL. Its goal is to actually CLOSE ${leadName} — the cold call already got them here. Judge Vlad against that goal: did he dig into their real situation, land the value proposition, handle objections, create urgency, and ask for the close or lock in a clear concrete next step? This is where "didn't ask for the close" and "next step left vague" genuinely matter.`;

  return `You are Vlad's sales coach, reviewing the transcript of a real ${kind === "CALL" ? "cold phone call" : "Zoom discovery call"} he had with ${leadName}.

${goalBlock}

The transcript is speaker-labeled but doesn't say which speaker is Vlad (the rep) vs. the lead — infer that from context.

Read the transcript and respond with ONLY a JSON object — no markdown fences, no commentary before or after — with exactly these keys:
{
  "notes": "A short, honest, specific write-up in plain prose (3-6 sentences), judged against this call's actual goal above. Reference actual moments from the call. No padding or generic praise.",
  "strengthTags": ["key", "key"],
  "issueTags": ["key", "key"]
}

strengthTags must be a subset of this list (use the exact keys, pick only ones that genuinely applied, can be empty):
${strengthTags.map((t) => `- ${t.key}: ${t.label}`).join("\n")}

issueTags must be a subset of this list (use the exact keys, pick only ones that genuinely applied, can be empty):
${issueTags.map((t) => `- ${t.key}: ${t.label}`).join("\n")}

Only tag something that's actually visible in the transcript — don't force a tag in just to fill the list.

Transcript:
---
${transcript}
---`;
}

export type AnalyzeResult =
  | { ok: true; notes: string | null; strengthTags: string[]; issueTags: string[]; generatedAt: string }
  | { ok: false; error: string; status: number };

export async function analyzeInteraction(interactionId: string): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 501,
      error:
        "Sales Coach isn't set up yet — add an ANTHROPIC_API_KEY environment variable in Railway (Project → Variables), then redeploy.",
    };
  }

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: { contact: { select: { companyName: true, contactName: true, status: true } } },
  });
  if (!interaction || !interaction.transcript) {
    return { ok: false, status: 404, error: "This call doesn't have a transcript yet." };
  }
  if (interaction.type !== "CALL" && interaction.type !== "VIDEO_CALL") {
    return { ok: false, status: 400, error: "Only calls and video calls can be coached." };
  }

  const kind = interaction.type as CallKind;
  const leadName = interaction.contact?.companyName || interaction.contact?.contactName || "this lead";
  const systemPrompt = promptFor(kind, leadName, interaction.transcript);

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
    return { ok: false, status: 502, error: err instanceof Error ? err.message : "Failed to analyze this call." };
  }

  const strengthTags = (parsed.strengthTags || []).filter((k) => isValidTag(strengthTagsFor(kind), k));
  const issueTags = (parsed.issueTags || []).filter((k) => isValidTag(issueTagsFor(kind), k));

  const updated = await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      coachingNotes: parsed.notes || null,
      coachingStrengthTags: strengthTags,
      coachingIssueTags: issueTags,
      coachingGeneratedAt: new Date(),
    },
  });

  return {
    ok: true,
    notes: updated.coachingNotes,
    strengthTags: updated.coachingStrengthTags,
    issueTags: updated.coachingIssueTags,
    generatedAt: updated.coachingGeneratedAt!.toISOString(),
  };
}
