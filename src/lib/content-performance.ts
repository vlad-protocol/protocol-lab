import { prisma } from "@/lib/prisma";
import {
  fetchInstagramMedia,
  fetchInstagramInsightsFor,
  downloadInstagramVideo,
  refreshInstagramTokenIfNeeded,
  listInstagramConnections,
} from "@/lib/integrations/instagram";
import { transcribeVideo, isTranscriptionConfigured } from "@/lib/integrations/transcription";
import { listZeffyCampaigns, getZeffyCampaignTotals } from "@/lib/integrations/zeffy";

const CONTENT_CATEGORIES = [
  "documentation/behind-the-scenes",
  "hype/promo",
  "educational",
  "testimonial/social-proof",
  "event recap",
  "comedic/entertainment",
  "other",
];

// --- 1. Pull new posts + refresh metrics for recent ones -----------------
//
// New media (never seen before) is inserted as PENDING for transcription.
// Posts from the last 30 days get their view/like/comment/share numbers
// refreshed every sync, since engagement keeps climbing for a while after
// posting — older posts are left alone rather than re-fetched forever.
export async function syncInstagramContent() {
  await refreshInstagramTokenIfNeeded();

  const connections = await listInstagramConnections();
  const results: { igMediaId: string; created: boolean; error?: string }[] = [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Multi-account: pull each connected account's media separately and
  // tag every row with which account it came from, so Content
  // Performance and the Content Engine can tell them apart.
  for (const connection of connections) {
    let media: Awaited<ReturnType<typeof fetchInstagramMedia>>;
    try {
      media = await fetchInstagramMedia(connection.id, 25);
    } catch (err) {
      results.push({
        igMediaId: `(account ${connection.username || connection.igUserId})`,
        created: false,
        error: err instanceof Error ? err.message : "media fetch failed",
      });
      continue;
    }

    for (const m of media) {
      try {
        const existing = await prisma.instagramPost.findUnique({ where: { igMediaId: m.igMediaId } });
        const shouldRefreshMetrics = !existing || (m.postedAt && m.postedAt > thirtyDaysAgo);

        let insights = { views: null, likes: null, comments: null, shares: null, saves: null } as Awaited<
          ReturnType<typeof fetchInstagramInsightsFor>
        >;
        if (shouldRefreshMetrics) {
          try {
            insights = await fetchInstagramInsightsFor(connection.id, m.igMediaId);
          } catch {
            // Insights can fail for very fresh posts (not yet processed) or
            // image-only posts with no video metrics — leave numbers null
            // rather than failing the whole sync over one post.
          }
        }

        const isVideo = m.mediaType === "VIDEO" || m.mediaType === "REELS";
        await prisma.instagramPost.upsert({
          where: { igMediaId: m.igMediaId },
          create: {
            igMediaId: m.igMediaId,
            permalink: m.permalink,
            mediaType: m.mediaType,
            caption: m.caption,
            thumbnailUrl: m.thumbnailUrl,
            postedAt: m.postedAt,
            transcriptStatus: isVideo ? "PENDING" : "SKIPPED",
            instagramConnectionId: connection.id,
            ...insights,
            lastMetricsSyncAt: shouldRefreshMetrics ? new Date() : null,
          },
          // Also backfills instagramConnectionId on an older row that
          // predates multi-account support, or one created by a
          // just-published ContentPost before this sync ran.
          update: shouldRefreshMetrics
            ? { ...insights, caption: m.caption, instagramConnectionId: connection.id, lastMetricsSyncAt: new Date() }
            : { caption: m.caption, instagramConnectionId: connection.id },
        });
        results.push({ igMediaId: m.igMediaId, created: !existing });
      } catch (err) {
        results.push({ igMediaId: m.igMediaId, created: false, error: err instanceof Error ? err.message : "failed" });
      }
    }
  }
  return results;
}

// --- 2. Transcribe whatever's waiting ------------------------------------
//
// Small batch per tick (transcription costs real money and takes real
// time per video) — see TRANSCRIBE_BATCH_PER_TICK in instrumentation.ts's
// caller.
export async function transcribePendingPosts(batchSize = 5) {
  if (!isTranscriptionConfigured()) return [];

  const pending = await prisma.instagramPost.findMany({
    where: { transcriptStatus: "PENDING" },
    take: batchSize,
    orderBy: { postedAt: "desc" },
  });

  const results: { id: string; error?: string }[] = [];
  for (const post of pending) {
    await prisma.instagramPost.update({ where: { id: post.id }, data: { transcriptStatus: "PROCESSING" } });
    try {
      if (!post.instagramConnectionId) throw new Error("This post isn't tagged with a connected account yet — it'll pick one up on the next sync.");
      const media = await fetchInstagramMedia(post.instagramConnectionId, 25);
      const match = media.find((m) => m.igMediaId === post.igMediaId);
      if (!match?.mediaUrl) throw new Error("Media URL no longer available from Instagram.");
      const buffer = await downloadInstagramVideo(match.mediaUrl);
      const transcript = await transcribeVideo(buffer, `${post.igMediaId}.mp4`);
      await prisma.instagramPost.update({
        where: { id: post.id },
        data: { transcript, transcriptStatus: "DONE", transcriptError: null },
      });
      results.push({ id: post.id });
    } catch (err) {
      const error = err instanceof Error ? err.message : "transcription failed";
      await prisma.instagramPost.update({
        where: { id: post.id },
        data: { transcriptStatus: "FAILED", transcriptError: error },
      });
      results.push({ id: post.id, error });
    }
  }
  return results;
}

// --- 3. Categorize whatever's transcribed but not yet labeled ------------

async function callClaude(system: string, userMessage: string, maxTokens = 500): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY isn't set.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const blocks: Array<{ type: string; text?: string }> = json.content || [];
  return blocks.filter((b) => b.type === "text" && b.text).map((b) => b.text).join("\n");
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function categorizePendingPosts(batchSize = 10) {
  const posts = await prisma.instagramPost.findMany({
    where: { transcriptStatus: "DONE", contentCategory: null },
    take: batchSize,
  });

  const results: { id: string; error?: string }[] = [];
  for (const post of posts) {
    try {
      const system = `You classify short-form fitness/events content for Protocol, a Montreal no-alcohol fitness-and-rave events brand. Read the caption and transcript of one Instagram Reel and pick exactly one category from this list: ${CONTENT_CATEGORIES.join(", ")}. Reply with ONLY a JSON object: {"category": "...", "reasoning": "one sentence on why"}.`;
      const userMessage = `Caption: ${post.caption || "(none)"}\n\nTranscript: ${post.transcript || "(none)"}`;
      const text = await callClaude(system, userMessage, 300);
      const parsed = extractJson(text);
      const category = (parsed?.category as string) || "other";
      const reasoning = (parsed?.reasoning as string) || null;
      await prisma.instagramPost.update({
        where: { id: post.id },
        data: { contentCategory: category, categoryReasoning: reasoning },
      });
      results.push({ id: post.id });
    } catch (err) {
      results.push({ id: post.id, error: err instanceof Error ? err.message : "categorization failed" });
    }
  }
  return results;
}

// --- 4. Sync Zeffy ticket/revenue totals for linked events ----------------

export async function syncZeffySales() {
  const events = await prisma.marketingEvent.findMany({
    where: { platform: "ZEFFY", zeffyCampaignId: { not: null } },
  });
  const results: { eventId: string; error?: string }[] = [];
  for (const event of events) {
    try {
      const totals = await getZeffyCampaignTotals(event.zeffyCampaignId!);
      await prisma.marketingEvent.update({
        where: { id: event.id },
        data: { ticketsSold: totals.ticketsSold, revenue: totals.revenue },
      });
      results.push({ eventId: event.id });
    } catch (err) {
      results.push({ eventId: event.id, error: err instanceof Error ? err.message : "sync failed" });
    }
  }
  return results;
}

export { listZeffyCampaigns };

// --- 5. The actual "what content sells tickets" assessment ----------------
//
// Pulls every event with at least one linked, categorized post and asks
// Claude to read the pattern across all of them — not a fixed formula,
// since what "works" is genuinely a judgment call across a handful of
// data points, not something to compute with a hardcoded stat.
export async function generatePerformanceAssessment(): Promise<string> {
  const events = await prisma.marketingEvent.findMany({
    include: { posts: true },
    orderBy: { eventDate: "desc" },
  });
  const withData = events.filter((e) => e.posts.length > 0);
  if (withData.length === 0) {
    return "Not enough data yet — link at least one categorized Reel to an event with ticket/RSVP numbers filled in, then run this again.";
  }

  const summary = withData
    .map((e) => {
      const sales =
        e.platform === "ZEFFY"
          ? `${e.ticketsSold ?? "?"} tickets, $${e.revenue ?? "?"} revenue (Zeffy)`
          : `${e.rsvpCount ?? "?"} RSVPs (Partiful)`;
      const posts = e.posts
        .map(
          (p) =>
            `  - [${p.contentCategory || "uncategorized"}] ${p.views ?? "?"} views, ${p.likes ?? "?"} likes, ${
              p.comments ?? "?"
            } comments, ${p.shares ?? "?"} shares — "${(p.caption || "").slice(0, 120)}"`
        )
        .join("\n");
      return `Event: ${e.name} (${e.pricing.toLowerCase()}, ${new Date(e.eventDate).toDateString()})\nResult: ${sales}\nContent posted:\n${posts}`;
    })
    .join("\n\n");

  const system =
    "You're a marketing analyst for Protocol, a Montreal no-alcohol fitness-and-rave events brand. Given a list of past events (paid or free, ticketing platform, and how many tickets/RSVPs they got) along with the Instagram Reels posted around each one (category, engagement numbers, captions), write a short, direct assessment of which kind of content actually correlates with ticket/RSVP sales versus which just gets views. Call out any pattern by content category, and flag if the data is too thin to conclude anything yet rather than overstating confidence. Plain prose, no headers, under 250 words.";
  return callClaude(system, summary, 700);
}
