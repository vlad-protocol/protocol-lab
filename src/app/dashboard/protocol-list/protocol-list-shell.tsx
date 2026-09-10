"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, Upload, FileSpreadsheet } from "lucide-react";

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source: "MANUAL" | "FORM";
  createdAt: string;
};

export function ProtocolListShell({ initialMembers }: { initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      `${m.name || ""} ${m.email || ""} ${m.phone || ""}`.toLowerCase().includes(q)
    );
  }, [members, search]);

  const withEmail = members.filter((m) => m.email).length;
  const withPhone = members.filter((m) => m.phone).length;

  async function remove(id: string) {
    if (!confirm("Remove this person from the Protocol List?")) return;
    await fetch(`/api/protocol-list/${id}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total people" value={members.length} />
        <StatCard label="With email" value={withEmail} />
        <StatCard label="With phone" value={withPhone} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--hq-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-lg border border-[var(--hq-card-border)] bg-white py-2 pl-8 pr-3 text-sm"
          />
        </div>
        <button
          onClick={() => {
            setShowAdd((s) => !s);
            setShowBulk(false);
            setShowImport(false);
          }}
          className="flex items-center gap-1 rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-3.5 w-3.5" /> {showAdd ? "Close" : "Add person"}
        </button>
        <button
          onClick={() => {
            setShowBulk((s) => !s);
            setShowAdd(false);
            setShowImport(false);
          }}
          className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--hq-text)]"
        >
          <Upload className="h-3.5 w-3.5" /> {showBulk ? "Close" : "Bulk add"}
        </button>
        <button
          onClick={() => {
            setShowImport((s) => !s);
            setShowAdd(false);
            setShowBulk(false);
          }}
          className="flex items-center gap-1 rounded-full border border-[var(--hq-card-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--hq-text)]"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> {showImport ? "Close" : "Import CSV/Excel"}
        </button>
      </div>

      {showAdd && (
        <AddForm
          onAdded={(m) => {
            setMembers((prev) => [m, ...prev]);
            setShowAdd(false);
          }}
        />
      )}

      {showBulk && (
        <BulkAdd
          onAdded={() => {
            setShowBulk(false);
            // Re-fetch the full list — bulk add can create many rows at once.
            fetch("/api/protocol-list")
              .then((r) => r.json())
              .then((d) => d.members && setMembers(d.members));
          }}
        />
      )}

      {showImport && (
        <FileImport
          onAdded={() => {
            setShowImport(false);
            fetch("/api/protocol-list")
              .then((r) => r.json())
              .then((d) => d.members && setMembers(d.members));
          }}
        />
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--hq-card-border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--hq-card-border)] text-left text-xs text-[var(--hq-text-muted)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Added</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[var(--hq-card-border)] last:border-0">
                <td className="px-4 py-2">{m.name || "—"}</td>
                <td className="px-4 py-2">{m.email || "—"}</td>
                <td className="px-4 py-2">{m.phone || "—"}</td>
                <td className="px-4 py-2 text-xs text-[var(--hq-text-muted)]">
                  {m.source === "FORM" ? "Signup form" : "Manual"}
                </td>
                <td className="px-4 py-2 text-xs text-[var(--hq-text-muted)]">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(m.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--hq-text-muted)]">
                  {members.length === 0 ? "No one on the list yet." : "No matches."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--hq-text)]">{value}</p>
    </div>
  );
}

function AddForm({ onAdded }: { onAdded: (m: Member) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/protocol-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, email: email || undefined, phone: phone || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Failed to add.");
      return;
    }
    onAdded(d.member);
    setName("");
    setEmail("");
    setPhone("");
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          placeholder="Name (optional)"
          className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Phone"
          className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <p className="text-xs text-[var(--hq-text-muted)]">At least one of email or phone is required.</p>
      <button disabled={busy} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        Add
      </button>
    </form>
  );
}

function BulkAdd({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/protocol-list/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setResult(d.error || "Failed to import.");
      return;
    }
    setResult(`Added ${d.added}${d.skipped ? `, skipped ${d.skipped} (no email or phone found)` : ""}.`);
    setText("");
    onAdded();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        Paste one person per line. Any of these formats work: just an email, just a phone number,
        or <code>name, email, phone</code> (any field can be left out).
      </p>
      <textarea
        required
        rows={8}
        placeholder={"jane@example.com\n+1 514 555 0100\nJohn Doe, john@example.com, +1 514 555 0101"}
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {result && <p className="text-sm text-[var(--hq-text)]">{result}</p>}
      <button disabled={busy} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        Import
      </button>
    </form>
  );
}

function FileImport({ onAdded }: { onAdded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/protocol-list/import-file", { method: "POST", body });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Failed to import.");
      return;
    }
    setResult(`Added ${d.added}${d.skipped ? `, skipped ${d.skipped} (no email or phone found)` : ""}.`);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onAdded();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <p className="text-xs text-[var(--hq-text-muted)]">
        Upload a .csv or Excel (.xlsx/.xls) file exported from Brevo or any other tool. We'll look for
        columns named something like "Name," "Email," and "Phone" — if none of those are recognized, or
        there's no header row, each cell is checked directly (a valid email or phone number is picked up
        either way).
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        required
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
      />
      {result && <p className="text-sm text-[var(--hq-text)]">{result}</p>}
      <button disabled={busy || !file} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        Import
      </button>
    </form>
  );
}
