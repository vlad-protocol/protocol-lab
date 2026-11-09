// AI layer for the Content Engine (idea queue -> scripts -> pre-post
// scoring -> repurposing). Same Claude call pattern as
// lib/content-performance.ts and lib/activation-drafts.ts — plain
// completions against the Messages API, JSON-only responses parsed with
// a tolerant trailing-brace scan, and every write is a draft a human
// reviews before it's locked in. None of this is a copy of any
// third-party scoring algorithm, UI, or branding — it's an original
// implementation of the same functional idea (idea swipe -> script ->
// pre-post score -> repurpose), built around Protocol's own voice.

const DRAFT_MODEL = "claude-sonnet-4-5-20250929"; // scripts/repurposing: worth the better model
const TAG_MODEL = "claude-haiku-4-5"; // tagging/scoring: cheap, high volume

async function callClaude(system: string, userMessage: string, maxTokens: number, model: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY isn't set — add it in Railway (Project → Variables), then redeploy.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText.slice(0, 300)}`);
  }
  const json = await res.json();
  const blocks: Array<{ type: string; text?: string }> = json.content || [];
  return blocks.filter((b) => b.type === "text" && b.text).map((b) => b.text).join("\n");
}

// Scans backward for the last substring that parses as JSON — Claude
// sometimes writes a sentence of reasoning before the JSON object, so a
// naive JSON.parse(text) would fail on an otherwise-good reply.
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

export function isContentEngineAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// --- Swipe stage: tag a saved idea with why it works ----------------------

export async function tagContentIdea(input: { title: string; whyItWorks?: string | null }): Promise<string | null> {
  if (!isContentEngineAiConfigured()) return null;
  const system = `You tag short-form video/content ideas with the single structural reason they're worth swiping — a short phrase (3-6 words) like "hook in first second", "names the enemy", "names a number up front", "before/after proof", "contrarian claim". Read the title and note, then reply with ONLY a JSON object: {"tag": "..."}. If you can't tell, reply {"tag": null}.`;
  const user = `Title: ${input.title}\nNote on why it's good: ${input.whyItWorks || "(none given)"}`;
  try {
    const text = await callClaude(system, user, 150, TAG_MODEL);
    const parsed = extractTrailingJson(text);
    const tag = parsed?.tag;
    return typeof tag === "string" && tag.trim() ? tag.trim() : null;
  } catch {
    return null;
  }
}

// --- Script stage: draft a script from a swiped idea or a bare topic ------

export type DraftedScript = {
  title: string;
  hook: string;
  body: string;
  closingPrompt: string;
};

export async function draftContentScript(input: {
  topic: string;
  whyItWorks?: string | null;
  brandVoice?: string;
}): Promise<DraftedScript> {
  const brand =
    input.brandVoice ||
    "Protocol, a Montreal no-alcohol fitness-and-rave events brand that also runs brand activations for other businesses — direct, a little irreverent, never corporate.";
  const system = `You write short-form video scripts (Reels/TikTok length, 30-60s) in this brand's voice: ${brand}

Follow these structural rules, which matter more than cleverness:
- The hook (first line, spoken in the first 1-3 seconds) has to work alone, with no setup — name a specific pain, a number, or a contrarian claim. No throat-clearing ("Hey guys", "So today I want to talk about").
- The body is a numbered list of short beats, one idea per line, each one sentence a viewer could read as on-screen text and say out loud without it feeling like two different things.
- End on a line designed to get comments — a direct question, a request to argue in the comments, or an invite to tag someone.

Reply with ONLY a JSON object: {"title": "short internal title", "hook": "...", "body": "line 1\\nline 2\\nline 3", "closingPrompt": "..."}`;
  const user = `Topic/idea: ${input.topic}${input.whyItWorks ? `\n\nWhy this angle works (from the swiped reference): ${input.whyItWorks}` : ""}`;
  const text = await callClaude(system, user, 900, DRAFT_MODEL);
  const parsed = extractTrailingJson(text);
  if (!parsed) throw new Error("Claude's reply wasn't valid JSON — try again.");
  return {
    title: (parsed.title as string) || input.topic.slice(0, 60),
    hook: (parsed.hook as string) || "",
    body: (parsed.body as string) || "",
    closingPrompt: (parsed.closingPrompt as string) || "",
  };
}

// --- Analyze stage: original pre-post score (0-100) -------------------------
//
// Deliberately not a copy of any third-party "virality" algorithm — a
// transparent, explainable blend of a few deterministic structural
// checks (hook length, body rhythm, whether it closes on a prompt) and
// one holistic AI read, averaged. Works even with no Claude key
// configured (falls back to the deterministic half alone), same
// fail-soft pattern as the rest of this app's AI features.

type ScoreFactor = { label: string; points: number };

function heuristicScore(hook: string, body: string, closingPrompt: string): { score: number; factors: ScoreFactor[] } {
  const factors: ScoreFactor[] = [];
  let score = 40; // baseline

  const hookWords = hook.trim().split(/\s+/).filter(Boolean).length;
  if (hookWords > 0 && hookWords <= 12) {
    score += 12;
    factors.push({ label: "Hook is short enough to land in the first few seconds", points: 12 });
  } else if (hookWords > 12) {
    factors.push({ label: "Hook runs long — trim it so it lands before a viewer can swipe", points: 0 });
  }

  if (/\d/.test(hook)) {
    score += 8;
    factors.push({ label: "Hook leads with a specific number", points: 8 });
  }
  if (/\b(stop|never|actually|nobody tells you|wrong|mistake)\b/i.test(hook)) {
    score += 8;
    factors.push({ label: "Hook makes a contrarian/specific claim", points: 8 });
  }

  const bodyLines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  if (bodyLines.length >= 3 && bodyLines.length <= 7) {
    score += 12;
    factors.push({ label: "Body is a tight, scannable list of beats", points: 12 });
  } else if (bodyLines.length > 0) {
    factors.push({ label: "Body beat count is outside the sweet spot (3-7 lines)", points: 0 });
  }

  if (closingPrompt && closingPrompt.trim().length > 0) {
    score += 10;
    factors.push({ label: "Ends on a comment-prompt line", points: 10 });
  } else {
    factors.push({ label: "No closing comment-prompt — add one to drive comments", points: 0 });
  }

  return { score: Math.max(0, Math.min(100, score)), factors };
}

export async function scoreContentScript(input: {
  hook: string;
  body: string;
  closingPrompt: string;
}): Promise<{ score: number; notes: string }> {
  const { score: baseScore, factors } = heuristicScore(input.hook, input.body, input.closingPrompt);
  const factorNotes = factors.map((f) => `${f.points > 0 ? "+" : "  "}${f.points} ${f.label}`).join("\n");

  if (!isContentEngineAiConfigured()) {
    return { score: baseScore, notes: factorNotes };
  }

  try {
    const system = `You grade short-form video scripts on how likely they are to hold attention and get shared, purely on the writing — not production quality, which hasn't happened yet. Score 0-100, where 100 is an exceptional, best-in-class hook and structure. Reply with ONLY a JSON object: {"score": <0-100 integer>, "note": "one sentence on the single biggest thing to fix, or why it's strong"}`;
    const user = `Hook: ${input.hook}\n\nBody:\n${input.body}\n\nCloses on: ${input.closingPrompt}`;
    const text = await callClaude(system, user, 250, TAG_MODEL);
    const parsed = extractTrailingJson(text);
    const aiScore = typeof parsed?.score === "number" ? Math.max(0, Math.min(100, parsed.score as number)) : baseScore;
    const aiNote = typeof parsed?.note === "string" ? (parsed.note as string) : "";
    const blended = Math.round((baseScore + aiScore) / 2);
    return { score: blended, notes: [factorNotes, aiNote].filter(Boolean).join("\n\n") };
  } catch {
    return { score: baseScore, notes: factorNotes };
  }
}

// --- Repurpose stage: winning post -> new hooks + a carousel ---------------

export type RepurposeResult = {
  title: string;
  newHooks: string[];
  slides: string[];
};

export async function repurposeWinningPost(input: {
  caption?: string | null;
  transcript?: string | null;
}): Promise<RepurposeResult> {
  const system = `You take one of this brand's best-performing short-form posts and spin it into fresh angles. Given its caption/transcript, write:
1. 2-4 alternate hook lines that reframe the same core idea from a different angle (not just reworded — a genuinely different entry point: a consequence, a confession, a comparison).
2. A 4-6 slide carousel breakdown of the SAME idea for a static carousel post: slide 1 is the hook/cover, each following slide is one short beat (under 12 words), building to a payoff or call-to-action on the last slide.
Reply with ONLY a JSON object: {"title": "short internal title for this carousel", "newHooks": ["...", "..."], "slides": ["slide 1 text", "slide 2 text", ...]}`;
  const user = `Caption: ${input.caption || "(none)"}\n\nTranscript: ${input.transcript || "(none — work from the caption alone)"}`;
  const text = await callClaude(system, user, 900, DRAFT_MODEL);
  const parsed = extractTrailingJson(text);
  if (!parsed) throw new Error("Claude's reply wasn't valid JSON — try again.");
  const newHooks = Array.isArray(parsed.newHooks) ? (parsed.newHooks as unknown[]).filter((h) => typeof h === "string") as string[] : [];
  const slides = Array.isArray(parsed.slides) ? (parsed.slides as unknown[]).filter((s) => typeof s === "string") as string[] : [];
  return {
    title: (parsed.title as string) || "Repurposed carousel",
    newHooks,
    slides,
  };
}
