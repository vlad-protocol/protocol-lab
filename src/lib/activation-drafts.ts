// AI drafting for the SOP's deal-stage documents (07A Proposal, 07B
// Contract excerpt, and the post-event report). Same Claude call pattern
// as /api/contacts/[id]/summarize — plain text completion, no web_search,
// since everything it needs is already on the Activation/Contact record.
// Output is always a draft only: nothing sends on its own, same as
// SequenceStepDraft for cold outreach.

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

async function callClaude(system: string, userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY isn't set — add it in Railway (Project → Variables), then redeploy.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.content?.[0]?.text as string) || "";
}

export type ActivationDraftInput = {
  brandName: string;
  contactName: string;
  eventName: string;
  eventDate: string | null;
  packageTier: string;
  quoteTotal: number;
  rules: Record<string, string | null>;
  // Only set when drafting a report
  report?: {
    attendanceTarget?: number | null;
    attendanceActual?: number | null;
    dayOfConversions?: number | null;
    revenueReported?: number | null;
    totalImpressions?: number | null;
    referralCount?: number | null;
    npsScore?: number | null;
  };
};

export async function draftProposal(input: ActivationDraftInput): Promise<string> {
  const system = `You draft brand-activation event proposals for Protocol, a Montreal fitness/events company, following its B2B SOP's "one brief, one invoice" proposal template (Section 07A): 1. The idea, 2. What this does for the brand, 3. Why Protocol, 4. What you get (deliverables table), 5. The offer at the event, 6. What we need from the brand, 7. Investment, 8. Key dates, 9. Next step. Write in a confident, concrete, non-generic voice — specific to this brand and event, not boilerplate. Output plain text with those 9 numbered headings, no markdown fences.`;
  const user = `Brand: ${input.brandName}\nContact: ${input.contactName}\nEvent: ${input.eventName}\nDate: ${input.eventDate || "TBD"}\nPackage: ${input.packageTier}\nQuote total (incl. tax): $${input.quoteTotal.toFixed(2)}\n\nActivation Rules answers (use these as the event's concept, don't invent new ones):\nGoal: ${input.rules.rule1Goal || "(not set)"}\nConnection: ${input.rules.rule2Connection || "(not set)"}\nCurrency: ${input.rules.rule3Currency || "(not set)"}\nStory: ${input.rules.rule4Story || "(not set)"}`;
  return callClaude(system, user);
}

export async function draftContractExcerpt(input: ActivationDraftInput): Promise<string> {
  const system = `You draft the deal-specific terms (clauses 1-2 and the Schedule A summary only, NOT the full legal boilerplate) of Protocol's brand-event contract, following its B2B SOP template (Section 07B). Fill in the services description, fee, and payment schedule (20% on signing, 40% at T-7 days, 40% within 72h of content delivery) using the numbers given. Flag clearly at the top: "DRAFT — needs a Quebec lawyer's review before use, same as every Protocol contract." Output plain text, no markdown fences.`;
  const user = `Brand: ${input.brandName}\nEvent: ${input.eventName}\nDate: ${input.eventDate || "TBD"}\nPackage: ${input.packageTier}\nTotal fee (incl. tax): $${input.quoteTotal.toFixed(2)}`;
  return callClaude(system, user);
}

export async function draftReport(input: ActivationDraftInput): Promise<string> {
  const r = input.report || {};
  const system = `You write the Page-1 scorecard plus a short "what we recommend next" section of Protocol's post-event report, following its B2B SOP template (Section 04). Use ONLY the numbers given — if a number is missing, write "not yet reported" rather than guessing. Output plain text.`;
  const user = `Event: ${input.eventName} (${input.brandName})\nDate: ${input.eventDate || "TBD"}\nAttendance: ${r.attendanceActual ?? "?"} / target ${r.attendanceTarget ?? "?"}\nDay-of conversions: ${r.dayOfConversions ?? "not yet reported"}\nRevenue reported by brand: ${r.revenueReported != null ? `$${r.revenueReported}` : "not yet reported"}\nTotal impressions: ${r.totalImpressions ?? "not yet reported"}\nReferrals: ${r.referralCount ?? "not yet reported"}\nNPS: ${r.npsScore ?? "not yet reported"}`;
  return callClaude(system, user);
}
