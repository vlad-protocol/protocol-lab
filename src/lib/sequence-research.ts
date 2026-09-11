// Live web research for a cold-outreach sequence step's "specific
// observation" line — see EmailSequenceStep.researchAngle and
// SequenceStepDraft in prisma/schema.prisma. Uses Claude's built-in
// web_search tool (executed server-side by Anthropic) rather than a
// separate search API, since the app already talks to the Messages API
// directly for the other AI features (summarize, suggest-followup).
//
// This is explicitly NOT trusted blindly — every result lands in
// Automation Confirmations with its sources and confidence attached for
// a human to check before anything sends. If the web_search tool isn't
// available (not enabled on the account, or the call fails outright),
// this fails soft: it returns an empty observation with a note saying
// so, rather than inventing something.

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export type ObservationResult = {
  observation: string;
  hook: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  researchedLive: boolean;
  note?: string;
};

type ContentBlock = {
  type: string;
  text?: string;
};

async function callClaudeWithSearch(system: string, userMessage: string): Promise<{ text: string; usedSearch: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY isn't set.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: userMessage }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const blocks: ContentBlock[] = json.content || [];
  const usedSearch = blocks.some((b) => b.type === "server_tool_use" || b.type === "web_search_tool_result");
  const text = blocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
  return { text, usedSearch };
}

// Scans backward for the last substring that parses as JSON — the model
// may write reasoning or search commentary before the final JSON object,
// so a naive JSON.parse(text) would fail even on an otherwise-good reply.
function extractTrailingJson(text: string): Record<string, unknown> | null {
  const cleaned = text.trim();
  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace === -1) return null;
  let searchFrom = lastBrace;
  while (searchFrom >= 0) {
    const start = cleaned.lastIndexOf("{", searchFrom);
    if (start === -1) return null;
    const candidate = cleaned.slice(start, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      searchFrom = start - 1;
    }
  }
  return null;
}

export async function researchStepPersonalization(opts: {
  brand: string;
  angle: string;
  language?: "EN" | "FR";
  context: {
    website?: string | null;
    industry?: string | null;
    eventOpportunity?: string | null;
    notes?: string | null;
  };
}): Promise<ObservationResult> {
  const { brand, angle, context, language = "EN" } = opts;
  const knownContext = [
    context.website ? `Website: ${context.website}` : null,
    context.industry ? `Industry: ${context.industry}` : null,
    context.eventOpportunity ? `Opportunity on file: ${context.eventOpportunity}` : null,
    context.notes ? `CRM notes: ${context.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const languageInstruction =
    language === "FR"
      ? "Write the \"observation\" and \"hook\" values in French — this goes straight into a French email to a French-speaking contact."
      : "Write the \"observation\" and \"hook\" values in English.";

  const system = `You are researching a real brand/company called "${brand}" ahead of a cold sponsorship outreach email from Protocol, a Montreal sober rave built around a group workout (AFTR:HOURS — real exercise first, then a DJ set).

Find one specific, true, checkable observation about ${brand} that fits this brief: ${angle}

Use web search to find something real and current — a recent launch, event, campaign, sponsorship, social post, or something specific about the audience they reach. Do not invent anything. If you can't find anything solid and verifiable, say so honestly (return an empty observation) rather than guessing.

${languageInstruction}

What's already on file about them:
${knownContext || "(nothing else on file)"}

When you're done researching, respond with ONLY a JSON object as the very last thing you write — no markdown fences, no text after it — with exactly these keys:
{
  "observation": "one specific sentence, written ready to drop into an email body, or an empty string if nothing solid was found",
  "hook": "a short (under 8 words) version of the same idea, for use in a subject line — or an empty string",
  "sources": ["url1", "url2"],
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const { text, usedSearch } = await callClaudeWithSearch(system, `Research ${brand} now and give me the observation.`);
    const parsed = extractTrailingJson(text);
    if (!parsed || typeof parsed.observation !== "string") {
      throw new Error("Couldn't parse a research result from the model's response.");
    }
    const confidence = parsed.confidence;
    return {
      observation: parsed.observation,
      hook: typeof parsed.hook === "string" ? parsed.hook : "",
      sources: Array.isArray(parsed.sources) ? parsed.sources.filter((s): s is string => typeof s === "string") : [],
      confidence: confidence === "high" || confidence === "medium" || confidence === "low" ? confidence : "low",
      researchedLive: usedSearch,
    };
  } catch (err) {
    return {
      observation: "",
      hook: "",
      sources: [],
      confidence: "low",
      researchedLive: false,
      note: err instanceof Error ? err.message : "Research failed.",
    };
  }
}
