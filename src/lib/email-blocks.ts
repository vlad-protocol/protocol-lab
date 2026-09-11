// Block-based email templates for Campaigns. A campaign's email body can
// either be the original plain HTML/text `body` field, or a `blocks` +
// `settings` structure built with the visual editor — an ordered list of
// simple, editable pieces (image, heading, text, button-with-link,
// divider, spacer) rendered here into table-based HTML that holds up
// across email clients (Gmail, Outlook, Apple Mail all still render
// tables far more reliably than modern CSS layout).
//
// Merge fields ({{contactName}}, {{companyName}}) are left untouched by
// this renderer — campaigns.ts fills those in per-recipient afterward,
// same as it already does for the plain-body path.

export type EmailBlock =
  | { id: string; type: "image"; url: string; alt: string; link?: string; width: number; align: "left" | "center" | "right" }
  | { id: string; type: "heading"; text: string; color: string; bgColor: string; fontSize: number; align: "left" | "center" | "right" }
  | { id: string; type: "text"; text: string; color: string; bgColor: string; fontSize: number; align: "left" | "center" | "right" }
  | {
      id: string;
      type: "button";
      text: string;
      url: string;
      bgColor: string;
      textColor: string;
      align: "left" | "center" | "right";
      borderRadius: number;
    }
  | { id: string; type: "divider"; color: string; thickness: number }
  | { id: string; type: "spacer"; height: number };

export type EmailSettings = {
  backgroundColor: string; // outer page background
  containerColor: string; // the "card" the blocks sit on
  maxWidth: number;
};

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  backgroundColor: "#f4f4f5",
  containerColor: "#ffffff",
  maxWidth: 600,
};

let counter = 0;
export function newBlockId() {
  counter += 1;
  return `b${Date.now()}${counter}`;
}

export function defaultBlock(type: EmailBlock["type"]): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "image":
      return { id, type, url: "", alt: "", link: "", width: 560, align: "center" };
    case "heading":
      return { id, type, text: "Your headline here", color: "#111111", bgColor: "", fontSize: 24, align: "left" };
    case "text":
      return { id, type, text: "Write your message here — supports {{contactName}} and {{companyName}}.", color: "#333333", bgColor: "", fontSize: 15, align: "left" };
    case "button":
      return { id, type, text: "Learn more", url: "", bgColor: "#111111", textColor: "#ffffff", align: "left", borderRadius: 6 };
    case "divider":
      return { id, type, color: "#e5e5e5", thickness: 1 };
    case "spacer":
      return { id, type, height: 24 };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Preserves {{mergeField}} tokens through escaping (fillTemplate runs
// after this, replacing the token with already-safe plain text).
function escapeKeepingMergeFields(s: string) {
  return s.replace(/\{\{(\w+)\}\}|[^{}]+/g, (m, field) => (field ? m : escapeHtml(m)));
}

function alignCss(align: "left" | "center" | "right") {
  return `text-align:${align};`;
}

function renderBlock(block: EmailBlock): string {
  switch (block.type) {
    case "image": {
      const img = `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" width="${block.width}" style="display:block;max-width:100%;width:${block.width}px;height:auto;border:0;" />`;
      const inner = block.link ? `<a href="${escapeHtml(block.link)}" target="_blank">${img}</a>` : img;
      return `<tr><td style="padding:12px 24px;${alignCss(block.align)}">${inner}</td></tr>`;
    }
    case "heading":
      return `<tr><td style="padding:16px 24px;${alignCss(block.align)}${block.bgColor ? `background-color:${escapeHtml(block.bgColor)};` : ""}"><h2 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:${block.fontSize}px;line-height:1.3;color:${escapeHtml(block.color)};font-weight:700;">${escapeKeepingMergeFields(block.text).replace(/\n/g, "<br/>")}</h2></td></tr>`;
    case "text":
      return `<tr><td style="padding:12px 24px;${alignCss(block.align)}${block.bgColor ? `background-color:${escapeHtml(block.bgColor)};` : ""}"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:${block.fontSize}px;line-height:1.5;color:${escapeHtml(block.color)};">${escapeKeepingMergeFields(block.text).replace(/\n/g, "<br/>")}</p></td></tr>`;
    case "button":
      return `<tr><td style="padding:16px 24px;${alignCss(block.align)}">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${block.align === "center" ? "margin:0 auto;" : block.align === "right" ? "margin-left:auto;" : ""}">
          <tr><td style="border-radius:${block.borderRadius}px;background-color:${escapeHtml(block.bgColor)};">
            <a href="${escapeHtml(block.url)}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:${escapeHtml(block.textColor)};text-decoration:none;border-radius:${block.borderRadius}px;">${escapeKeepingMergeFields(block.text)}</a>
          </td></tr>
        </table>
      </td></tr>`;
    case "divider":
      return `<tr><td style="padding:12px 24px;"><div style="border-top:${block.thickness}px solid ${escapeHtml(block.color)};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>`;
    case "spacer":
      return `<tr><td style="padding:0;height:${block.height}px;line-height:${block.height}px;font-size:1px;">&nbsp;</td></tr>`;
  }
}

export function renderEmailBlocksHtml(blocks: EmailBlock[], settings: EmailSettings): string {
  const rows = blocks.map(renderBlock).join("\n");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${escapeHtml(settings.backgroundColor)};">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${escapeHtml(settings.backgroundColor)};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="${settings.maxWidth}" border="0" cellpadding="0" cellspacing="0" style="max-width:${settings.maxWidth}px;width:100%;background-color:${escapeHtml(settings.containerColor)};border-radius:8px;overflow:hidden;">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
