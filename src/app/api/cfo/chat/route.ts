import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { RAMIT_BUDGET_PLAN } from "@/lib/cfo-budget-plan";

// The Personal CFO chat. Grounds the model in the user's real budget/category
// state (sent from the client each request, not stored server-side) so advice
// references actual numbers instead of generic personal-finance platitudes.
// Requires ANTHROPIC_API_KEY on the server — see README for setup. Model is
// overridable via ANTHROPIC_MODEL since model IDs change over time; check
// https://docs.claude.com/en/docs/about-claude/models for current ones.

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "cfo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "CFO Chat isn't set up yet — add an ANTHROPIC_API_KEY environment variable in Railway (Project → Variables), then redeploy. See the README for the full steps.",
      },
      { status: 501 }
    );
  }

  const body = await req.json();
  const { messages, context } = body as { messages?: ChatMessage[]; context?: string };
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(context);

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
      console.error("CFO chat: Anthropic API error", res.status, errText);
      return NextResponse.json(
        { error: "The CFO chat had trouble reaching Claude. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data?.content?.[0]?.type === "text" ? data.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("CFO chat: request failed", err);
    return NextResponse.json({ error: "The CFO chat had trouble reaching Claude. Try again in a moment." }, { status: 502 });
  }
}

function buildSystemPrompt(context?: string) {
  return `You are Vlad's personal CFO — a calm, direct financial coach for his own personal (non-business) money, grounded in the framework from Ramit Sethi's "I Will Teach You to Be Rich": a Conscious Spending Plan of Fixed Costs (~50-60% of reliable income), Investments (~10%), Savings (~5-10%), and Guilt-Free Spending (~20-35%).

His current situation: reliable monthly income is about $${RAMIT_BUDGET_PLAN.reliableMonthlyIncome} (payroll plus regular bank transfers), separate from irregular business/event revenue that should be treated as a bonus rather than baked into the everyday budget. He recently signed a lease at about $950/month and has a $400 credit card balance to pay off. His recommended budget:
${Object.entries(RAMIT_BUDGET_PLAN.categoryBudgets)
  .map(([k, v]) => `- ${k}: $${v}/mo`)
  .join("\n")}

Key notes behind that plan:
${RAMIT_BUDGET_PLAN.notes.map((n) => `- ${n}`).join("\n")}

${context ? `Here is his current live data from the app (categories, recent spending, goals, debts):\n${context}\n` : ""}

Be specific and reference his actual numbers rather than generic advice. Ask a clarifying question when you genuinely need one piece of missing information, but don't interrogate him — default to giving a clear, direct answer or recommendation. Keep responses conversational and reasonably short unless he asks for depth. You are not a licensed financial advisor — for anything like taxes, investment account types, or legal debt questions, give the general shape of the answer and note he should confirm specifics with a professional, without being preachy about it.`;
}
