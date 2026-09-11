"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Heading,
  Type,
  MousePointerClick,
  Minus,
  MoveVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Upload,
  Loader2,
  Eye,
  X,
  GripVertical,
  Settings2,
} from "lucide-react";
import {
  type EmailBlock,
  type EmailSettings,
  defaultBlock,
  newBlockId,
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

// A Canva-style layout: a fixed left rail to add elements, a scrollable
// gray "canvas" in the middle holding the actual page (clicking a block
// selects it, right on the canvas — no separate list to scroll through),
// and a right-hand panel whose contents follow the selection: page
// settings when nothing's selected, that block's fields when one is.
export function BlockEditor({
  blocks,
  settings,
  onChange,
}: {
  blocks: EmailBlock[];
  settings: EmailSettings;
  onChange: (blocks: EmailBlock[], settings: EmailSettings) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  function addBlock(type: EmailBlock["type"]) {
    const block = defaultBlock(type);
    // Insert right after the selected block, if any, so building the
    // email top-to-bottom feels natural — otherwise append to the end.
    const i = selectedId ? blocks.findIndex((b) => b.id === selectedId) : -1;
    const next = i >= 0 ? [...blocks.slice(0, i + 1), block, ...blocks.slice(i + 1)] : [...blocks, block];
    onChange(next, settings);
    setSelectedId(block.id);
  }

  function updateBlock(id: string, patch: Partial<EmailBlock>) {
    onChange(
      blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)),
      settings
    );
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id), settings);
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy = { ...blocks[i], id: newBlockId() };
    const next = [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
    onChange(next, settings);
    setSelectedId(copy.id);
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next, settings);
  }

  function reorderByDrag(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const from = blocks.findIndex((b) => b.id === draggedId);
    const to = blocks.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next, settings);
  }

  function updateSettings(patch: Partial<EmailSettings>) {
    onChange(blocks, { ...settings, ...patch });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--hq-card-border)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--hq-card-border)] bg-white px-3 py-2">
        <p className="text-xs font-semibold text-[var(--hq-text)]">Design your email</p>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 rounded-md border border-[var(--hq-card-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--hq-text)] hover:bg-neutral-50"
        >
          <Eye className="h-3.5 w-3.5" /> Preview real email
        </button>
      </div>

      <div className="flex" style={{ height: 620 }}>
        {/* Left rail — add elements */}
        <div className="w-[132px] shrink-0 overflow-y-auto border-r border-[var(--hq-card-border)] bg-neutral-50 p-2">
          <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">Add</p>
          <div className="grid grid-cols-2 gap-1.5">
            {BLOCK_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => addBlock(t.type)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-[var(--hq-card-border)] bg-white px-1 py-2.5 text-[10px] font-medium text-[var(--hq-text)] hover:border-[var(--hq-accent)] hover:text-[var(--hq-accent)]"
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: "#e5e7eb" }}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="mx-auto overflow-hidden rounded-lg shadow-md"
            style={{ maxWidth: settings.maxWidth, backgroundColor: settings.containerColor }}
            onClick={(e) => e.stopPropagation()}
          >
            {blocks.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-sm text-[var(--hq-text-muted)]">Nothing here yet — add a block from the left.</p>
              </div>
            )}
            {blocks.map((b) => (
              <CanvasBlock
                key={b.id}
                block={b}
                selected={selectedId === b.id}
                dragging={dragId === b.id}
                dragOver={overId === b.id}
                onSelect={() => setSelectedId(b.id)}
                onMoveUp={() => moveBlock(b.id, -1)}
                onMoveDown={() => moveBlock(b.id, 1)}
                onDuplicate={() => duplicateBlock(b.id)}
                onRemove={() => removeBlock(b.id)}
                onDragStart={() => setDragId(b.id)}
                onDragOverBlock={() => setOverId(b.id)}
                onDrop={() => {
                  if (dragId) reorderByDrag(dragId, b.id);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              />
            ))}
          </div>
        </div>

        {/* Right panel — contextual properties */}
        <div className="w-[280px] shrink-0 overflow-y-auto border-l border-[var(--hq-card-border)] bg-white p-3">
          {selectedBlock ? (
            <BlockProperties block={selectedBlock} onUpdate={(patch) => updateBlock(selectedBlock.id, patch)} />
          ) : (
            <PageProperties settings={settings} onUpdate={updateSettings} />
          )}
        </div>
      </div>

      {showPreview && (
        <PreviewModal
          html={
            blocks.length > 0
              ? renderEmailBlocksHtml(blocks, settings)
              : "<p style='font-family:sans-serif;color:#999;padding:24px'>Nothing to preview yet.</p>"
          }
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function PreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--hq-card-border)] px-4 py-2.5">
          <p className="text-sm font-semibold text-[var(--hq-text)]">Real email preview</p>
          <button type="button" onClick={onClose} className="text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe title="Real email preview" srcDoc={html} className="flex-1" style={{ minHeight: 500 }} sandbox="" />
      </div>
    </div>
  );
}

function PageProperties({ settings, onUpdate }: { settings: EmailSettings; onUpdate: (patch: Partial<EmailSettings>) => void }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hq-text)]">
        <Settings2 className="h-3.5 w-3.5" /> Page settings
      </p>
      <p className="mt-1 text-[11px] text-[var(--hq-text-muted)]">Click a block on the canvas to edit it directly.</p>
      <div className="mt-3 space-y-3">
        <ColorField label="Page background" value={settings.backgroundColor} onChange={(v) => onUpdate({ backgroundColor: v })} />
        <ColorField label="Card background" value={settings.containerColor} onChange={(v) => onUpdate({ containerColor: v })} />
        <Field label="Max width (px)">
          <input
            type="number"
            value={settings.maxWidth}
            onChange={(e) => onUpdate({ maxWidth: Number(e.target.value) || 600 })}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

function CanvasBlock({
  block,
  selected,
  dragging,
  dragOver,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragOverBlock,
  onDrop,
  onDragEnd,
}: {
  block: EmailBlock;
  selected: boolean;
  dragging: boolean;
  dragOver: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOverBlock: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverBlock();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group relative outline-2 -outline-offset-2 transition ${
        selected ? "outline outline-[var(--hq-accent)]" : dragOver ? "outline outline-blue-300" : "outline-transparent hover:outline hover:outline-neutral-300"
      } ${dragging ? "opacity-40" : ""}`}
    >
      {/* Floating toolbar — visible when selected or hovered */}
      <div
        className={`absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-md border border-[var(--hq-card-border)] bg-white px-0.5 py-0.5 shadow-sm ${
          selected ? "flex" : "hidden group-hover:flex"
        }`}
      >
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart();
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            onDragEnd();
          }}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab p-1 text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]"
          title="Drag to reorder"
        >
          <GripVertical className="h-3 w-3" />
        </span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]" title="Move up">
          <ChevronUp className="h-3 w-3" />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]" title="Move down">
          <ChevronDown className="h-3 w-3" />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]" title="Duplicate">
          <Copy className="h-3 w-3" />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-[var(--hq-text-muted)] hover:text-red-600" title="Delete">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <BlockPreview block={block} />
    </div>
  );
}

// Renders an approximation of each block's real appearance directly as
// JSX (rather than the raw table HTML from renderBlock) so it can be
// clicked/selected on the canvas. Colors, alignment, and sizing mirror
// email-blocks.ts's renderBlock — use "Preview real email" to see the
// pixel-accurate table-based HTML that actually gets sent.
function BlockPreview({ block }: { block: EmailBlock }) {
  const justify = block.type !== "divider" && block.type !== "spacer" && "align" in block ? alignToJustify(block.align) : undefined;

  switch (block.type) {
    case "image":
      return (
        <div className="flex p-3" style={{ justifyContent: justify }}>
          {block.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.url} alt={block.alt} style={{ width: block.width, maxWidth: "100%" }} />
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-xs text-neutral-400">
              No image set
            </div>
          )}
        </div>
      );
    case "heading":
      return (
        <div className="px-4 py-3" style={{ backgroundColor: block.bgColor || undefined, textAlign: block.align }}>
          <h2 style={{ margin: 0, fontFamily: "Arial,Helvetica,sans-serif", fontSize: block.fontSize, color: block.color, fontWeight: 700, whiteSpace: "pre-wrap" }}>
            {block.text || "Heading"}
          </h2>
        </div>
      );
    case "text":
      return (
        <div className="px-4 py-2.5" style={{ backgroundColor: block.bgColor || undefined, textAlign: block.align }}>
          <p style={{ margin: 0, fontFamily: "Arial,Helvetica,sans-serif", fontSize: block.fontSize, color: block.color, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {block.text || "Text"}
          </p>
        </div>
      );
    case "button":
      return (
        <div className="flex px-4 py-3" style={{ justifyContent: justify }}>
          <span
            style={{
              display: "inline-block",
              padding: "10px 24px",
              fontFamily: "Arial,Helvetica,sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: block.textColor,
              backgroundColor: block.bgColor,
              borderRadius: block.borderRadius,
            }}
          >
            {block.text || "Button"}
          </span>
        </div>
      );
    case "divider":
      return (
        <div className="px-4 py-2.5">
          <div style={{ borderTop: `${block.thickness}px solid ${block.color}` }} />
        </div>
      );
    case "spacer":
      return <div style={{ height: block.height }} />;
  }
}

function alignToJustify(align: "left" | "center" | "right") {
  return align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
}

function BlockProperties({ block, onUpdate }: { block: EmailBlock; onUpdate: (patch: Partial<EmailBlock>) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[var(--hq-text-muted)]">{block.type} block</p>

      <div className="mt-3 space-y-3">
        {block.type === "image" && (
          <>
            <Field label="Image">
              <ImageUploadField url={block.url} onUploaded={(url) => onUpdate({ url })} />
            </Field>
            <Field label="Or paste an image URL directly">
              <input className={inputCls} value={block.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Alt text">
              <input className={inputCls} value={block.alt} onChange={(e) => onUpdate({ alt: e.target.value })} />
            </Field>
            <Field label="Link URL (optional)">
              <input className={inputCls} value={block.link || ""} onChange={(e) => onUpdate({ link: e.target.value })} placeholder="https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </>
        )}

        {(block.type === "heading" || block.type === "text") && (
          <>
            <Field label="Text — supports {{contactName}}, {{companyName}}">
              <textarea
                className={inputCls}
                rows={block.type === "heading" ? 2 : 4}
                value={block.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Text color" value={block.color} onChange={(v) => onUpdate({ color: v })} />
              <ColorField label="Background" value={block.bgColor} onChange={(v) => onUpdate({ bgColor: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
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
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Button color" value={block.bgColor} onChange={(v) => onUpdate({ bgColor: v })} />
              <ColorField label="Text color" value={block.textColor} onChange={(v) => onUpdate({ textColor: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </>
        )}

        {block.type === "divider" && (
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Color" value={block.color} onChange={(v) => onUpdate({ color: v })} />
            <Field label="Thickness (px)">
              <input type="number" className={inputCls} value={block.thickness} onChange={(e) => onUpdate({ thickness: Number(e.target.value) || 1 })} />
            </Field>
          </div>
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
        <div className="mt-2 overflow-hidden rounded-md border border-[var(--hq-card-border)] bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="block max-h-32 w-full object-contain" />
        </div>
      )}
    </div>
  );
}
