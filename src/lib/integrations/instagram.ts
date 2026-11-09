import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Instagram API with Instagram Login ("Business Login for Instagram") —
// since this only ever reads the one Instagram professional account you
// own, it qualifies for Standard Access and needs no Meta App Review.
// Set up a Meta Developer App with Instagram configured, then set
// IG_APP_ID / IG_APP_SECRET / IG_REDIRECT_URI here (same shape as the
// Gmail OAuth env vars).
//
// Token lifecycle: the initial code exchange gives a short-lived token,
// immediately swapped for a long-lived one (~60 days). It has to be
// refreshed before it expires — refreshInstagramTokenIfNeeded() below is
// called from the background tick (see instrumentation.ts) and only
// actually hits the API once the token is more than a day old and within
// two weeks of expiring, per Meta's refresh rules.

const GRAPH_VERSION = "v21.0";
const GRAPH_HOST = "https://graph.facebook.com";
// NOTE (Nov 2026): Meta now forces newly-created apps onto its "Unified
// Login" flow (a System User Access Token / SUAT), not the classic
// direct Instagram-Login OAuth this file originally targeted. The old
// getInstagramAuthUrl/exchangeInstagramCode path below only works on an
// app that still has classic "Business Login for Instagram" available —
// a new Meta app hits "Invalid platform app" on it instead. The
// supported path now is connectInstagramManually(): generate a SUAT for
// the account in Meta's dashboard (Use cases -> Instagram API -> API
// setup with Unified login -> Generate access tokens), then paste it
// into Settings. SUAT tokens never expire (no refresh needed) and are
// called via graph.facebook.com using the account's ig-user-id as the
// node, confirmed live — graph.instagram.com and the "me" shortcut both
// fail for this token type.

export function isInstagramConfigured() {
  return Boolean(process.env.IG_APP_ID && process.env.IG_APP_SECRET && process.env.IG_REDIRECT_URI);
}

export function getInstagramAuthUrl(state: string) {
  const appId = process.env.IG_APP_ID;
  const redirectUri = process.env.IG_REDIRECT_URI;
  if (!appId || !redirectUri) throw new Error("Instagram isn't configured yet.");
  const scope = [
    "instagram_business_basic",
    "instagram_business_manage_insights",
    "instagram_business_content_publish",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
  ].join(",");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// Exchanges the OAuth `code` for a short-lived token, then immediately
// upgrades it to a long-lived one and looks up the account's own
// id/username — everything the connect callback needs in one call.
export async function exchangeInstagramCode(code: string) {
  const appId = process.env.IG_APP_ID;
  const appSecret = process.env.IG_APP_SECRET;
  const redirectUri = process.env.IG_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) throw new Error("Instagram isn't configured yet.");

  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!shortRes.ok) throw new Error(`Instagram token exchange failed: ${await shortRes.text()}`);
  const shortJson = await shortRes.json();
  const shortToken = shortJson.access_token as string;
  const igUserId = String(shortJson.user_id);

  const longParams = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortToken,
  });
  const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`);
  if (!longRes.ok) throw new Error(`Instagram long-lived token exchange failed: ${await longRes.text()}`);
  const longJson = await longRes.json();
  const accessToken = longJson.access_token as string;
  const expiresAt = new Date(Date.now() + (longJson.expires_in || 5184000) * 1000); // default ~60 days

  const meRes = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/me?fields=user_id,username&access_token=${accessToken}`
  );
  const meJson = meRes.ok ? await meRes.json() : {};

  return {
    igUserId: String(meJson.user_id || igUserId),
    username: (meJson.username as string) || null,
    accessToken,
    expiresAt,
  };
}

async function getConnection() {
  return prisma.instagramConnection.findFirst({ orderBy: { connectedAt: "desc" } });
}

// Manual-token connect path: Meta's newer "Unified Login" apps issue a
// System User Access Token (SUAT) directly from the dashboard instead of
// through an OAuth redirect. SUATs never expire, so tokenExpiresAt is set
// ~100 years out — refreshInstagramTokenIfNeeded()'s renewal-window check
// above then naturally never fires for this connection. Verifies the
// token against graph.facebook.com (not graph.instagram.com — confirmed
// live that SUATs are only recognized on the Facebook host) using the
// given igUserId as the node, before ever saving it.
export async function connectInstagramManually({
  igUserId,
  accessToken,
}: {
  igUserId: string;
  accessToken: string;
}) {
  const verifyRes = await fetch(
    `${GRAPH_HOST}/${GRAPH_VERSION}/${igUserId}?fields=username,ig_id&access_token=${accessToken}`
  );
  if (!verifyRes.ok) {
    throw new Error(`Instagram token verification failed: ${await verifyRes.text()}`);
  }
  const verifyJson = await verifyRes.json();
  const username = (verifyJson.username as string) || null;

  const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
  const existing = await getConnection();
  if (existing) {
    return prisma.instagramConnection.update({
      where: { id: existing.id },
      data: {
        igUserId,
        username,
        accessToken: encryptSecret(accessToken),
        tokenExpiresAt: farFuture,
        lastRefreshAt: new Date(),
      },
    });
  }
  return prisma.instagramConnection.create({
    data: {
      igUserId,
      username,
      accessToken: encryptSecret(accessToken),
      tokenExpiresAt: farFuture,
      connectedAt: new Date(),
    },
  });
}

// Meta's rule: a long-lived token can be refreshed for another ~60 days
// once it's at least 24 hours old, any time before it expires. Called
// every tick but only actually hits the network when it's genuinely due
// (older than a day, and within two weeks of expiring) or after the
// initial connect — cheap to call often.
export async function refreshInstagramTokenIfNeeded() {
  const conn = await getConnection();
  if (!conn) return;

  const now = Date.now();
  const dayOld = now - conn.connectedAt.getTime() > 24 * 60 * 60 * 1000;
  const lastRefreshOldEnough = !conn.lastRefreshAt || now - conn.lastRefreshAt.getTime() > 24 * 60 * 60 * 1000;
  const withinRenewalWindow = conn.tokenExpiresAt.getTime() - now < 14 * 24 * 60 * 60 * 1000;
  if (!dayOld || !lastRefreshOldEnough || !withinRenewalWindow) return;

  try {
    const accessToken = decryptSecret(conn.accessToken);
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
    );
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    await prisma.instagramConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encryptSecret(json.access_token),
        tokenExpiresAt: new Date(Date.now() + (json.expires_in || 5184000) * 1000),
        lastRefreshAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[instagram] token refresh failed:", err);
  }
}

export type InstagramMedia = {
  igMediaId: string;
  permalink: string | null;
  mediaType: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  postedAt: Date | null;
};

// Pulls the account's media, newest first. `after` is a Graph API paging
// cursor; omit it to start from the top. Capped per call by the caller
// (see syncInstagramContent in content-performance.ts) rather than here.
export async function fetchInstagramMedia(limit = 25): Promise<InstagramMedia[]> {
  const conn = await getConnection();
  if (!conn) throw new Error("Instagram isn't connected yet.");
  const accessToken = decryptSecret(conn.accessToken);

  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const res = await fetch(
    `${GRAPH_HOST}/${GRAPH_VERSION}/${conn.igUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Instagram media fetch failed: ${await res.text()}`);
  const json = await res.json();
  const items: Array<Record<string, string>> = json.data || [];
  return items.map((m) => ({
    igMediaId: m.id,
    permalink: m.permalink || null,
    mediaType: m.media_type || null,
    caption: m.caption || null,
    thumbnailUrl: m.thumbnail_url || m.media_url || null,
    mediaUrl: m.media_url || null,
    postedAt: m.timestamp ? new Date(m.timestamp) : null,
  }));
}

export type InstagramInsights = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
};

// Video/Reels and image posts expose different insight metrics, and
// asking for an unsupported one fails the WHOLE request — so this tries
// the richer Reels metric set first and falls back to the plainer one
// rather than giving up on metrics entirely for an older-style post.
async function fetchMediaInsights(mediaId: string, accessToken: string): Promise<InstagramInsights> {
  const metricSets = ["reach,likes,comments,shares,saved,plays", "reach,likes,comments,shares,saved"];
  for (const metrics of metricSets) {
    const res = await fetch(
      `${GRAPH_HOST}/${GRAPH_VERSION}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
    );
    if (!res.ok) continue;
    const json = await res.json();
    const data: Array<{ name: string; values?: { value: number }[]; total_value?: { value: number } }> = json.data || [];
    const get = (name: string) => {
      const row = data.find((d) => d.name === name);
      return row?.total_value?.value ?? row?.values?.[0]?.value ?? null;
    };
    return {
      views: get("plays") ?? get("reach"),
      likes: get("likes"),
      comments: get("comments"),
      shares: get("shares"),
      saves: get("saved"),
    };
  }
  return { views: null, likes: null, comments: null, shares: null, saves: null };
}

export async function fetchInstagramInsightsFor(mediaId: string): Promise<InstagramInsights> {
  const conn = await getConnection();
  if (!conn) throw new Error("Instagram isn't connected yet.");
  const accessToken = decryptSecret(conn.accessToken);
  return fetchMediaInsights(mediaId, accessToken);
}

// Downloads the raw video bytes for a post so they can be handed to a
// transcription service — mediaUrl is a signed, time-limited CDN link
// Instagram returns alongside each media item, not something to store.
export async function downloadInstagramVideo(mediaUrl: string): Promise<Buffer> {
  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`Failed to download Instagram media: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Publishes a video (Reel) that's already hosted somewhere reachable by
// Instagram's servers (e.g. uploaded to S3/Cloudinary outside this app —
// this project has no video storage/generation of its own yet). Uses the
// Content Publishing API's two-step container flow: create a media
// container from the video URL, poll until Instagram finishes processing
// it, then publish the container. Returns the new post's Instagram media
// id so the caller can link it back to a ContentPost row.
export async function publishInstagramReel(videoUrl: string, caption: string): Promise<string> {
  const conn = await getConnection();
  if (!conn) throw new Error("Instagram isn't connected yet.");
  const accessToken = decryptSecret(conn.accessToken);

  const createRes = await fetch(`${GRAPH_HOST}/${GRAPH_VERSION}/${conn.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: accessToken,
    }).toString(),
  });
  if (!createRes.ok) throw new Error(`Instagram container creation failed: ${await createRes.text()}`);
  const { id: creationId } = await createRes.json();

  // Instagram processes the video asynchronously — poll status_code
  // (IN_PROGRESS -> FINISHED/ERROR) rather than publishing immediately,
  // which fails if the container isn't ready yet. Capped at ~2 minutes
  // of polling; a video that isn't done by then almost certainly failed.
  const deadline = Date.now() + 2 * 60 * 1000;
  while (Date.now() < deadline) {
    const statusRes = await fetch(
      `${GRAPH_HOST}/${GRAPH_VERSION}/${creationId}?fields=status_code&access_token=${accessToken}`
    );
    if (!statusRes.ok) throw new Error(`Instagram container status check failed: ${await statusRes.text()}`);
    const { status_code } = await statusRes.json();
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`Instagram failed to process the video (status: ${status_code}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const publishRes = await fetch(`${GRAPH_HOST}/${GRAPH_VERSION}/${conn.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: creationId, access_token: accessToken }).toString(),
  });
  if (!publishRes.ok) throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
  const { id: mediaId } = await publishRes.json();
  return mediaId as string;
}
