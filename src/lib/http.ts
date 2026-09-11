// Building a public, externally-reachable URL from inside a request
// handler is trickier than `new URL(req.url)` looks — on Railway (and
// most reverse-proxy hosts), the connection Next.js actually sees is the
// internal proxy hop, so req.url's protocol/host can come back as plain
// http on an internal host even though the site is served over https at
// its real public domain. Silently building an http:// URL on an https
// page is exactly why an <img src> pointing at one shows as a broken
// image with no visible error — browsers block that as mixed content.
// The proxy still tells the truth via the standard X-Forwarded-* headers,
// so prefer those; PUBLIC_APP_URL (when set) wins over everything since
// it's the one value that's always correct regardless of what any given
// request's headers say.
export function publicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/+$/, "");

  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}
