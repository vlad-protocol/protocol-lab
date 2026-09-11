"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { buildSignatureHtml, type SignatureFields } from "@/lib/email-signature";

type Signature = SignatureFields | null;

const inputCls = "w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm";

export function EmailSignatureCard({ initial, email }: { initial: Signature; email: string }) {
  const [sig, setSig] = useState<SignatureFields>(
    initial || {
      signatureEnabled: false,
      signatureName: "",
      signatureTitle: "",
      signatureCompany: "",
      signatureAddress: "",
      signaturePhone: "",
      signatureEmail: email,
      signatureWebsite: "",
      signatureInstagram: "",
      signatureFacebook: "",
      signatureLogoUrl: "",
      signatureAccent: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<SignatureFields>) {
    setSig((s) => ({ ...s, ...patch }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/account/email-signature", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sig),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to save your signature.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const preview = buildSignatureHtml(sig);

  return (
    <div className="mt-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--hq-text)]">Signed off on your emails</p>
          <p className="mt-1 text-xs text-[var(--hq-text-muted)]">
            Appended automatically to every email you send from Protocol HQ — automated sequence/automation
            emails and anything sent from the Mail page or a lead's page alike. Only affects mail sent from
            your own connected Gmail.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--hq-text-muted)]">
          <input
            type="checkbox"
            checked={sig.signatureEnabled}
            onChange={(e) => update({ signatureEnabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Name"
          value={sig.signatureName || ""}
          onChange={(e) => update({ signatureName: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Title (e.g. Founder)"
          value={sig.signatureTitle || ""}
          onChange={(e) => update({ signatureTitle: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Company / brand (e.g. Protocol)"
          value={sig.signatureCompany || ""}
          onChange={(e) => update({ signatureCompany: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Logo image URL (optional — a hosted image; falls back to text)"
          value={sig.signatureLogoUrl || ""}
          onChange={(e) => update({ signatureLogoUrl: e.target.value })}
        />
        <textarea
          className={`${inputCls} sm:col-span-2`}
          placeholder="Address (optional, one line per row)"
          rows={2}
          value={sig.signatureAddress || ""}
          onChange={(e) => update({ signatureAddress: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Email to show (defaults to your own)"
          value={sig.signatureEmail || ""}
          onChange={(e) => update({ signatureEmail: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Phone (optional)"
          value={sig.signaturePhone || ""}
          onChange={(e) => update({ signaturePhone: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Website (optional, e.g. byprotocol.com)"
          value={sig.signatureWebsite || ""}
          onChange={(e) => update({ signatureWebsite: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Instagram (handle, @handle, or full URL) — shown as a clickable link"
          value={sig.signatureInstagram || ""}
          onChange={(e) => update({ signatureInstagram: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Facebook (optional — handle or full URL)"
          value={sig.signatureFacebook || ""}
          onChange={(e) => update({ signatureFacebook: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Accent color hex (optional, e.g. #c9a24b)"
          value={sig.signatureAccent || ""}
          onChange={(e) => update({ signatureAccent: e.target.value })}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save signature"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Saved.
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">Preview</p>
        {preview ? (
          <div className="mt-2 rounded-lg bg-[var(--hq-canvas)] p-4" dangerouslySetInnerHTML={{ __html: preview }} />
        ) : (
          <p className="mt-2 text-xs text-[var(--hq-text-muted)]">
            Turn it on and add at least a name to see a preview.
          </p>
        )}
      </div>
    </div>
  );
}
