// Open/click tracking for campaign emails. Each EmailSend row already has
// an unguessable cuid, so the tracking pixel and click-redirect routes
// identify a send by that id directly (same trust model as an unsubscribe
// token — the id itself is the secret, and the worst case of someone
// guessing it is a fake "open"/"click" against their own inbox).
//
// wrapLinksForClickTracking runs on the FINAL per-recipient HTML (after
// merge fields are filled in), so it works the same whether that HTML
// came from the plain `body` field or from renderEmailBlocksHtml.

const HREF_RE = /href="(https?:\/\/[^"]+)"/g;

export function wrapLinksForClickTracking(html: string, baseUrl: string, sendId: string): string {
  return html.replace(HREF_RE, (match, url: string) => {
    // Don't wrap the unsubscribe link — clicking it already goes
    // somewhere meaningful to track (a suppression), and doubly-encoding
    // it through the click redirect adds no value.
    if (url.includes("/unsubscribe/")) return match;
    // Don't double-wrap a link that's already a tracking redirect.
    if (url.includes("/api/track/click/")) return match;
    const tracked = `${baseUrl}/api/track/click/${sendId}?u=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}

export function trackingPixelHtml(baseUrl: string, sendId: string): string {
  return `<img src="${baseUrl}/api/track/open/${sendId}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;
}

// A 1x1 transparent GIF, served by the open-tracking route.
export const TRANSPARENT_PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64"
);
