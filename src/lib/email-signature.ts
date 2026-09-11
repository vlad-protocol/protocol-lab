// Renders a person's email signature as a self-contained HTML card (dark
// background, logo/wordmark on the left, contact details on the right,
// a clickable website/Instagram/Facebook row underneath) plus a plain-
// text fallback for the text/plain half of the outbound message. Pure
// rendering only — no Prisma here — so it's safe to import from a client
// component for a live preview as well as from the server send path
// (lib/integrations/gmail.ts, which fetches the fields and calls this).
//
// Deliberately built from structured fields rather than pasted-in HTML:
// keeps every teammate's signature visually consistent and means there's
// never any user-authored markup to trust when assembling an email.

export type SignatureFields = {
  signatureEnabled: boolean;
  signatureName: string | null;
  signatureTitle: string | null;
  signatureCompany: string | null;
  signatureAddress: string | null;
  signaturePhone: string | null;
  signatureEmail: string | null;
  signatureWebsite: string | null;
  signatureInstagram: string | null;
  signatureFacebook: string | null;
  signatureLogoUrl: string | null;
  signatureAccent: string | null;
};

export const DEFAULT_SIGNATURE_ACCENT = "#c9a24b";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Accepts a bare handle ("@byprotocol" or "byprotocol"), or a full URL,
// and always returns a real clickable https:// URL — this is what makes
// "just type your handle" work while still producing a link that opens.
function toProfileUrl(input: string, host: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "").replace(/\/+$/, "");
  return `https://${host}/${handle}`;
}

function toWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function displayHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function buildSignatureHtml(sig: SignatureFields): string | null {
  if (!sig.signatureEnabled || !sig.signatureName?.trim()) return null;

  const accent = /^#[0-9a-fA-F]{3,8}$/.test(sig.signatureAccent || "")
    ? (sig.signatureAccent as string)
    : DEFAULT_SIGNATURE_ACCENT;

  const addressLines = (sig.signatureAddress || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");

  const contactLines = [sig.signatureEmail, sig.signaturePhone]
    .filter((v): v is string => !!v?.trim())
    .map((v) => escapeHtml(v.trim()))
    .join(" &nbsp;·&nbsp; ");

  const logoCell = sig.signatureLogoUrl
    ? `<img src="${escapeHtml(sig.signatureLogoUrl)}" alt="${escapeHtml(sig.signatureCompany || sig.signatureName)}" height="40" style="display:block;border:0;max-height:40px;">`
    : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:2px;color:#ffffff;">${escapeHtml(
        (sig.signatureCompany || sig.signatureName || "").toUpperCase()
      )}</div>`;

  const links: string[] = [];
  if (sig.signatureWebsite?.trim()) {
    const url = toWebsiteUrl(sig.signatureWebsite);
    links.push(
      `<a href="${escapeHtml(url)}" style="color:${accent};text-decoration:none;font-weight:600;">${escapeHtml(displayHost(url))}</a>`
    );
  }
  if (sig.signatureInstagram?.trim()) {
    const url = toProfileUrl(sig.signatureInstagram, "instagram.com");
    links.push(
      `<a href="${escapeHtml(url)}" style="color:${accent};text-decoration:none;font-weight:600;">Instagram</a>`
    );
  }
  if (sig.signatureFacebook?.trim()) {
    const url = toProfileUrl(sig.signatureFacebook, "facebook.com");
    links.push(
      `<a href="${escapeHtml(url)}" style="color:${accent};text-decoration:none;font-weight:600;">Facebook</a>`
    );
  }

  const linksRow = links.length
    ? `<tr><td colspan="2" style="padding-top:14px;">
         <div style="border-top:1px solid #34343e;padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
           ${links.join(' &nbsp;&nbsp;·&nbsp;&nbsp; ')}
         </div>
       </td></tr>`
    : "";

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#15151b;border-radius:12px;max-width:480px;">
  <tr>
    <td style="padding:22px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="padding-right:20px;border-right:1px solid #34343e;">
            ${logoCell}
          </td>
          <td valign="middle" style="padding-left:20px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:15px;font-weight:700;color:#ffffff;">${escapeHtml(sig.signatureName.trim())}</div>
            ${
              sig.signatureTitle?.trim() || sig.signatureCompany?.trim()
                ? `<div style="font-size:12px;color:#b7b7c2;margin-top:2px;">${[sig.signatureTitle, sig.signatureCompany]
                    .filter((v): v is string => !!v?.trim())
                    .map((v) => escapeHtml(v.trim()))
                    .join(" &nbsp;·&nbsp; ")}</div>`
                : ""
            }
            ${addressLines ? `<div style="font-size:12px;color:#b7b7c2;margin-top:8px;line-height:1.5;">${addressLines}</div>` : ""}
            ${contactLines ? `<div style="font-size:12px;color:#b7b7c2;margin-top:6px;">${contactLines}</div>` : ""}
          </td>
        </tr>
        ${linksRow}
      </table>
    </td>
  </tr>
</table>`.trim();
}

export function buildSignatureText(sig: SignatureFields): string | null {
  if (!sig.signatureEnabled || !sig.signatureName?.trim()) return null;

  const lines: string[] = [sig.signatureName.trim()];
  const titleLine = [sig.signatureTitle, sig.signatureCompany].filter((v): v is string => !!v?.trim()).join(" · ");
  if (titleLine) lines.push(titleLine);
  const address = (sig.signatureAddress || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  lines.push(...address);
  const contact = [sig.signatureEmail, sig.signaturePhone].filter((v): v is string => !!v?.trim()).join(" · ");
  if (contact) lines.push(contact);
  if (sig.signatureWebsite?.trim()) lines.push(displayHost(toWebsiteUrl(sig.signatureWebsite)));
  if (sig.signatureInstagram?.trim()) lines.push(`Instagram: ${toProfileUrl(sig.signatureInstagram, "instagram.com")}`);
  if (sig.signatureFacebook?.trim()) lines.push(`Facebook: ${toProfileUrl(sig.signatureFacebook, "facebook.com")}`);

  return lines.join("\n");
}

// Turns a plain-text email body (the format every send path in this app
// already works with — sequence templates, drafts, Mail compose) into
// safe HTML paragraphs for the text/html half of the outbound message.
export function bodyTextToHtml(body: string): string {
  const paragraphs = body.split(/\n{2,}/).map((p) => escapeHtml(p).replace(/\n/g, "<br>"));
  return paragraphs.map((p) => `<p style="margin:0 0 14px 0;">${p}</p>`).join("\n");
}

// Full HTML document for the text/html MIME part: body content plus,
// underneath a bit of spacing, the signature card (if any).
export function buildHtmlEmail(body: string, signatureHtml: string | null): string {
  const bodyHtml = bodyTextToHtml(body);
  const sigBlock = signatureHtml ? `<div style="margin-top:22px;">${signatureHtml}</div>` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;">${bodyHtml}${sigBlock}</div>`;
}
