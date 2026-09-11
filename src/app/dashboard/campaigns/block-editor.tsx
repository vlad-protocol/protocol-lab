"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Heading, Type, MousePointerClick, Minus, MoveVertical, Trash2, ChevronUp, ChevronDown, Plus, Upload, Loader2 } from "lucide-react";
import {
  type EmailBlock,
  type EmailSettings,
  defaultBlock,
  renderEmailBlocksHtml,
} from "@/lib/email-blocks";

const BLOCK_TYPES: { type: EmailBlock["type"]; label: string; icon: typeof ImageIcon }[] = [
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "heading", label: "Heading", icon: Heading },
  { type: "text", label: "Text", icon: Type },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: MoveVertical },
];

export function BlockEditor({
  blocks,
  settings,
  onChange,
}: {
  blocks: EmailBlock[];
  settings: EmailSettings;
  onChange: (blocks: EmailBlock[], settings: EmailSettings) => void;
}) {
  const [showPreview, setShowPreview] = useState(true);

  function addBlock(type: EmailBlock["type"]) {
    onChange([...blocks, defaultBlock(type)], settings);
  }

  function updateBlock(id: string, patch: Partial<EmailBlock>) {
    onChange(
      blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)),
      settings
    );
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id), settings);
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next, settings);
  }

  function updateSettings(patch: Partial<EmailSettings>) {
    onChange(blocks, { ...settings, ...patch });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="rounded-lg border border-[var(--hq-card-border)] bg-neutral-50 p-3">
          <p className="text-xs font-semibold text-[var(--hq-text)]">Page settings</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ColorField label="Page background" value={settings.backgroundColor} onChange={(v) => updateSettings({ backgroundColor: v })} />
            <ColorField label="Card background" value={settings.containerColor} onChange={(v) => updateSettings({ containerColor: v })} />
            <div>
              <label className="block text-[10px] text-[var(--hq-text-muted)]">Max width</label>
              <input
                type="number"
                value={settings.maxWidth}
                onChange={(e) => updateSettings({ maxWidth: Number(e.target.value) || 600 })}
                className="mt-0.5 w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {BLOCK_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => addBlock(t.type)}
                className="flex items-center gap-1 rounded-md border border-[var(--hq-card-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--hq-text)] hover:bg-neutral-50"
              >
                <Plus className="h-3 w-3" /> <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          {blocks.length === 0 && (
            <p className="rounded-lg border border-dashed border-[var(--hq-card-border)] p-4 text-center text-xs text-[var(--hq-text-muted)]">
              Add a block above to start building the email.
            </p>
          )}
          {blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              block={b}
              index={i}
              total={blocks.length}
              onUpdate={(patch) => updateBlock(b.id, patch)}
              onRemove={() => removeBlock(b.id)}
              onMove={(dir) => moveBlock(b.id, dir)}
            />
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowPreview((s) => !s)}
          className="text-xs font-medium text-[var(--hq-accent)]"
        >
          {showPreview ? "Hide preview" : "Show preview"}
        </button>
        {showPreview && (
          <div className="mt-2 overflow-hidden rounded-lg border border-[var(--hq-card-border)]" style={{ height: 560 }}>
            <iframe
              title="Email preview"
              srcDoc={blocks.length > 0 ? renderEmailBlocksHtml(blocks, settings) : "<p style='font-family:sans-serif;color:#999;padding:24px'>Nothing to preview yet.</p>"}
              className="h-full w-full"
              sandbox=""
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-[var(--hq-text-muted)]">{label}</label>
      <div className="mt-0.5 flex items-center gap-1">
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 shrink-0 rounded border border-[var(--hq-card-border)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-[var(--hq-card-border)] px-1.5 py-1 text-xs"
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[var(--hq-text-muted)]">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1 text-xs";
const selectCls = inputCls;

function BlockRow({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: EmailBlock;
  index: number;
  total: number;
  onUpdate: (patch: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--hq-card-border)] bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-[var(--hq-text-muted)]">{block.type}</p>
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="text-[var(--hq-text-muted)] disabled:opacity-30 hover:text-[var(--hq-text)]">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="text-[var(--hq-text-muted)] disabled:opacity-30 hover:text-[var(--hq-text)]">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="text-[var(--hq-text-muted)] hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {block.type === "image" && (
          <>
            <div className="col-span-2">
              <Field label="Image">
                <ImageUploadField url={block.url} onUploaded={(url) => onUpdate({ url })} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Or paste an image URL directly">
                <input className={inputCls} value={block.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://…" />
              </Field>
            </div>
            <Field label="Alt text">
              <input className={inputCls} value={block.alt} onChange={(e) => onUpdate({ alt: e.target.value })} />
            </Field>
            <Field label="Link URL (optional)">
              <input className={inputCls} value={block.link || ""} onChange={(e) => onUpdate({ link: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Width (px)">
              <input type="number" className={inputCls} value={block.width} onChange={(e) => onUpdate({ width: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Align">
              <select className={selectCls} value={block.align} onChange={(e) => onUpdate({ align: e.target.value as never })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
          </>
        )}

        {(block.type === "heading" || block.type === "text") && (
          <>
            <div className="col-span-2">
              <Field label="Text — supports {{contactName}}, {{companyName}}">
                <textarea
                  className={inputCls}
                  rows={block.type === "heading" ? 2 : 3}
                  value={block.text}
                  onChange={(e) => onUpdate({ text: e.target.value })}
                />
              </Field>
            </div>
            <ColorField label="Text color" value={block.color} onChange={(v) => onUpdate({ color: v })} />
            <ColorField label="Background (optional)" value={block.bgColor} onChange={(v) => onUpdate({ bgColor: v })} />
            <Field label="Font size (px)">
              <input type="number" className={inputCls} value={block.fontSize} onChange={(e) => onUpdate({ fontSize: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Align">
              <select className={selectCls} value={block.align} onChange={(e) => onUpdate({ align: e.target.value as never })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
          </>
        )}

        {block.type === "button" && (
          <>
            <Field label="Button text">
              <input className={inputCls} value={block.text} onChange={(e) => onUpdate({ text: e.target.value })} />
            </Field>
            <Field label="Link URL">
              <input className={inputCls} value={block.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://…" />
            </Field>
            <ColorField label="Button color" value={block.bgColor} onChange={(v) => onUpdate({ bgColor: v })} />
            <ColorField label="Text color" value={block.textColor} onChange={(v) => onUpdate({ textColor: v })} />
            <Field label="Corner radius (px)">
              <input type="number" className={inputCls} value={block.borderRadius} onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Align">
              <select className={selectCls} value={block.align} onChange={(e) => onUpdate({ align: e.target.value as never })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
          </>
        )}

        {block.type === "divider" && (
          <>
            <ColorField label="Color" value={block.color} onChange={(v) => onUpdate({ color: v })} />
            <Field label="Thickness (px)">
              <input type="number" className={inputCls} value={block.thickness} onChange={(e) => onUpdate({ thickness: Number(e.target.value) || 1 })} />
            </Field>
          </>
        )}

        {block.type === "spacer" && (
          <Field label="Height (px)">
            <input type="number" className={inputCls} value={block.height} onChange={(e) => onUpdate({ height: Number(e.target.value) || 0 })} />
          </Field>
        )}
      </div>
    </div>
  );
}

function ImageUploadField({ url, onUploaded }: { url: string; onUploaded: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Upload failed.");
        return;
      }
      onUploaded(d.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-[var(--hq-card-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--hq-text)] disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        {url && <span className="truncate text-xs text-emerald-600">Image set</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {url && (
        <div className="mt-2 overflow-hidden rounded-md border border-[var(--hq-card-border)] bg-neutral-50" style={{ maxWidth: 220 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="block max-h-32 w-full object-contain" />
        </div>
      )}
    </div>
  );
}
