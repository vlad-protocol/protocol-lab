"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

// A small, dependency-free rich text editor for Sales Script bodies —
// bold/italic/underline, bullet/numbered lists, and a font picker. Built
// on contentEditable + document.execCommand rather than pulling in a
// full rich-text library, since the formatting surface owners actually
// asked for here is this narrow (no images, no links, no headings).
// execCommand is deprecated but still broadly supported for exactly
// this kind of simple in-page formatting in every browser this app
// targets; the output HTML is re-sanitized server-side on save
// regardless (see lib/sanitize-script-html.ts), so there's no trust
// placed in the browser's execCommand output alone.
//
// Mount with `key={someStableId}` from the parent whenever you need the
// editor to reset to a new `initialValue` (e.g. switching which script
// is being edited) — the editor only seeds its contentEditable div once,
// from initialValue, and never overwrites it again, so typing isn't
// fought by a re-render.

const FONT_OPTIONS = [
  { label: "Default", value: "inherit" },
  { label: "Sans-serif", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "georgia, 'times new roman', serif" },
  { label: "Monospace", value: "'courier new', monospace" },
  { label: "Handwritten", value: "'comic sans ms', cursive" },
];

export function ScriptRichTextEditor({
  initialValue,
  onChange,
  minHeightClassName = "min-h-[120px]",
}: {
  initialValue: string;
  onChange: (html: string) => void;
  minHeightClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !ref.current) return;
    ref.current.innerHTML = initialValue;
    seeded.current = true;
    // Use CSS-based styling (style="font-weight: bold" etc.) instead of
    // legacy <b>/<font> tags so output lines up with the style
    // properties our sanitizer allowlists.
    try {
      document.execCommand("styleWithCSS", false, "true" as unknown as string);
    } catch {
      // Some browsers don't support this query — formatting still works,
      // it'll just come out as <b>/<i>/<u> tags, which the sanitizer
      // also allows.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="rounded-md border border-[var(--hq-card-border)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--hq-card-border)] bg-[var(--hq-canvas)] p-1.5">
        <button
          type="button"
          title="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
          className="rounded p-1.5 text-neutral-600 hover:bg-white hover:text-[var(--hq-accent)]"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
          className="rounded p-1.5 text-neutral-600 hover:bg-white hover:text-[var(--hq-accent)]"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
          className="rounded p-1.5 text-neutral-600 hover:bg-white hover:text-[var(--hq-accent)]"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--hq-card-border)]" />
        <button
          type="button"
          title="Bullet list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
          className="rounded p-1.5 text-neutral-600 hover:bg-white hover:text-[var(--hq-accent)]"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Numbered list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertOrderedList")}
          className="rounded p-1.5 text-neutral-600 hover:bg-white hover:text-[var(--hq-accent)]"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--hq-card-border)]" />
        <select
          defaultValue=""
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => {
            if (!e.target.value) return;
            exec("fontName", e.target.value);
            e.target.value = "";
          }}
          className="rounded border border-[var(--hq-card-border)] bg-white px-1.5 py-1 text-xs text-neutral-600"
        >
          <option value="" disabled>
            Font…
          </option>
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        className={`${minHeightClassName} w-full px-3 py-2 text-sm text-[var(--hq-text)] outline-none [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc`}
      />
    </div>
  );
}
