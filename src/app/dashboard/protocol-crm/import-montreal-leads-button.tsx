"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import type { Lead } from "./types";

// One-off button for the Montreal 100-studio sponsorship list — hits
// /api/contacts/import-montreal-leads, which is dedupe-safe to re-run
// (skips anything already in the CRM by email or company name), so
// there's no harm leaving this in place permanently.
export function ImportMontrealLeadsButton({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<{ total: number; alreadyImported: number } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/contacts/import-montreal-leads")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d));
  }, []);

  async function run() {
    setImporting(true);
    const res = await fetch("/api/contacts/import-montreal-leads", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (res.ok) {
      setStatus((prev) => ({ total: prev?.total ?? data.created + data.skipped, alreadyImported: (prev?.alreadyImported ?? 0) + data.created }));
      onImported();
      if (data.errors?.length) alert(`Imported ${data.created}, skipped ${data.skipped} already-existing.\n\nSome rows failed:\n${data.errors.join("\n")}`);
    } else {
      alert(data.error || "Import failed.");
    }
  }

  if (!status) return null;
  const done = status.alreadyImported >= status.total;

  return (
    <button
      onClick={run}
      disabled={importing || done}
      className="flex items-center gap-1 rounded-lg border border-[var(--hq-card-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--hq-text)] disabled:opacity-50"
      title={done ? "All 100 Montreal leads are already in the CRM" : "Import the 100-studio Montreal sponsorship list"}
    >
      <Upload className="h-3.5 w-3.5" />
      {importing
        ? "Importing…"
        : done
        ? `Montreal leads imported (${status.alreadyImported})`
        : `Import Montreal leads (${status.total})`}
    </button>
  );
}
