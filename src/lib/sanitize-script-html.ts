// A tiny allowlist HTML sanitizer for Sales Script bodies specifically.
//
// Scripts are only ever written by the OWNER (see /api/sales/scripts and
// /api/sales/scripts/[id] — both gate writes to session.user.role ===
// "OWNER"), and the formatting toolbar in sales-dashboard-view.tsx only
// ever produces a handful of tags via document.execCommand. We don't
// need a full HTML sanitizer library for that — this allowlist is
// intentionally narrow and defense-in-depth against a compromised owner
// session or a pasted snippet, not a general-purpose sanitizer for
// untrusted/public input. Do not reuse this for anything user-facing
// beyond Sales Scripts without reassessing the allowlist.
//
// Strategy: strip any tag not on ALLOWED_TAGS (and its content, for tags
// that only ever carry unsafe payloads like <script>/<style>), then on
// every remaining tag strip every attribute except a `style` attribute
// whose declarations are entirely drawn from ALLOWED_STYLE_PROPS with
// safe-looking values.

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
]);

// Tags whose entire contents (not just the tag) must be dropped — these
// only ever exist to run code or inject styling we don't control.
const STRIP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed"]);

const ALLOWED_STYLE_PROPS = new Set(["font-family", "font-weight", "font-style", "text-decoration"]);

// A conservative allowlist of font-family values the UI's font picker
// actually offers — keeps arbitrary CSS injection out of the one
// property most likely to be abused for layout breakage.
const ALLOWED_FONT_FAMILIES = new Set([
  "inherit",
  "ui-sans-serif, system-ui, sans-serif",
  "georgia, 'times new roman', serif",
  "'courier new', monospace",
  "'comic sans ms', cursive",
]);

function sanitizeStyleAttr(styleValue: string): string | null {
  const kept: string[] = [];
  for (const decl of styleValue.split(";")) {
    const [rawProp, ...rawValParts] = decl.split(":");
    if (!rawProp || rawValParts.length === 0) continue;
    const prop = rawProp.trim().toLowerCase();
    const value = rawValParts.join(":").trim().toLowerCase();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (prop === "font-family" && !ALLOWED_FONT_FAMILIES.has(value)) continue;
    if (prop === "font-weight" && !/^(normal|bold|[1-9]00)$/.test(value)) continue;
    if (prop === "font-style" && !/^(normal|italic)$/.test(value)) continue;
    if (prop === "text-decoration" && !/^(none|underline)$/.test(value)) continue;
    kept.push(`${prop}: ${value}`);
  }
  return kept.length ? kept.join("; ") : null;
}

export function sanitizeScriptHtml(html: string): string {
  // Drop tags (and everything inside them) that only ever exist to run
  // code or pull in external styling.
  let out = html;
  for (const tag of STRIP_WITH_CONTENT) {
    out = out.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, "gi"), "");
  }

  // Walk every remaining tag; drop ones not on the allowlist (keeping
  // their text content), and on kept tags strip every attribute except a
  // sanitized `style`.
  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagNameRaw, attrs) => {
    const tagName = String(tagNameRaw).toLowerCase();
    const isClosing = match.startsWith("</");
    if (!ALLOWED_TAGS.has(tagName)) return "";
    if (isClosing) return `</${tagName}>`;

    const styleMatch = /style\s*=\s*"([^"]*)"/i.exec(attrs) || /style\s*=\s*'([^']*)'/i.exec(attrs);
    const safeStyle = styleMatch ? sanitizeStyleAttr(styleMatch[1]) : null;
    return safeStyle ? `<${tagName} style="${safeStyle}">` : `<${tagName}>`;
  });

  return out;
}
