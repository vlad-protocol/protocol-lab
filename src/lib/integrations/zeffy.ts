import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

// Zeffy has no OAuth flow — an org admin generates a bearer API key from
// their dashboard (Settings → Integrations) and that's the whole setup.
// The API is read-only for our purposes: campaigns (their "events"/forms)
// and payments (ticket purchases against a campaign). See
// support.zeffy.com/get-started-with-the-zeffy-api.

// Heads up: Zeffy's exact endpoint paths/field names below (BASE_URL,
// /v1/campaigns, /v1/payments, and the amount/quantity field names) are
// a best-effort read of their public docs at zeffy.com/api/docs, not
// something tested against a real key yet. Once you paste in your API
// key and this hits real data, check a browser network tab or Zeffy's
// docs directly if totals look wrong — the auth model (Bearer token)
// and general shape (campaigns + payments, paginated) is confirmed;
// exact field names may need a small tweak here.
const BASE_URL = "https://api.zeffy.com";

export async function isZeffyConfigured() {
  const conn = await prisma.zeffyConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  return !!conn;
}

async function getApiKey(): Promise<string> {
  const conn = await prisma.zeffyConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  if (!conn) throw new Error("Zeffy isn't connected yet — add an API key in Settings.");
  return decryptSecret(conn.apiKey);
}

async function zeffyFetch(path: string) {
  const apiKey = await getApiKey();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Zeffy API error (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export type ZeffyCampaign = { id: string; title: string; goal?: number | null; totalRaised?: number | null };

// Lists your Zeffy campaigns/forms so an event can be linked to one by
// picking from this list rather than typing an id blind.
export async function listZeffyCampaigns(): Promise<ZeffyCampaign[]> {
  const json = await zeffyFetch("/v1/campaigns");
  const items: Array<Record<string, unknown>> = (json.data || json.campaigns || json) as Array<Record<string, unknown>>;
  return items.map((c) => ({
    id: String(c.id),
    title: String(c.title || c.name || "Untitled"),
    goal: (c.goal as number) ?? null,
    totalRaised: (c.totalRaised as number) ?? null,
  }));
}

// Sums ticket count + revenue for one campaign from its payments —
// what actually populates MarketingEvent.ticketsSold/revenue. Paginates
// through every payment for the campaign rather than trusting a single
// "totalRaised"-style field, since that may include donations/tips that
// aren't ticket purchases depending on how the campaign is set up.
export async function getZeffyCampaignTotals(campaignId: string): Promise<{ ticketsSold: number; revenue: number }> {
  let ticketsSold = 0;
  let revenue = 0;
  let cursor: string | null = null;

  do {
    const qs = new URLSearchParams({ campaignId, status: "succeeded", limit: "100" });
    if (cursor) qs.set("cursor", cursor);
    const json: {
      data?: Array<{ amount?: number; quantity?: number; ticketQuantity?: number }>;
      nextCursor?: string | null;
    } = await zeffyFetch(`/v1/payments?${qs.toString()}`);
    const payments = json.data || [];
    for (const p of payments) {
      revenue += Number(p.amount || 0);
      ticketsSold += Number(p.ticketQuantity ?? p.quantity ?? 1);
    }
    cursor = json.nextCursor || null;
  } while (cursor);

  return { ticketsSold, revenue };
}
