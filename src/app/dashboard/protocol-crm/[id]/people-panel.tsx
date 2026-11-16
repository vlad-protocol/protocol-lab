"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Phone, Plus, Trash2, Users, Star, Pencil } from "lucide-react";

export type Person = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type PrimaryContact = {
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
};

const inputCls = "w-full rounded-md border border-[var(--hq-card-border)] px-2 py-1.5 text-sm";

function AddPersonForm({ contactId, onDone }: { contactId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/contacts/${contactId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, title, email, phone }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Failed to add.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-[var(--hq-card-border)] p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputCls} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className={inputCls} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputCls} placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-[var(--hq-text)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add person"}
        </button>
        <button onClick={onDone} className="text-xs text-[var(--hq-text-muted)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

// The lead's own primary contact — the one automated sequence emails
// actually send to (see resolveOutboundEmail in crm-contact.ts). Rendered
// with the exact same card shape as a secondary PersonRow below, just
// pinned first and labeled "Primary" instead of getting its own
// differently-styled bar in the header. Promoting a secondary person
// (via their "Make primary" button) swaps this card's data server-side
// and this one simply reflects whoever's primary now — no separate UI
// state to reconcile.
function PrimaryContactCard({ contactId, contact, onChanged }: { contactId: string; contact: PrimaryContact; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: draft.name.trim() || contact.name,
        title: draft.title?.trim() || null,
        email: draft.email?.trim() || null,
        phone: draft.phone?.trim() || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-[var(--hq-card-border)] p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputCls} placeholder="Title" value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <input className={inputCls} placeholder="Phone" value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={save} disabled={saving} className="rounded-md bg-[var(--hq-text)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => { setDraft(contact); setEditing(false); }} className="text-xs text-[var(--hq-text-muted)]">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--hq-accent)]/40 bg-[var(--hq-accent-soft)]/30 p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--hq-text)]">
          {contact.name}
          {contact.title && <span className="font-normal text-[var(--hq-text-muted)]"> · {contact.title}</span>}
          <span className="rounded bg-[var(--hq-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--hq-accent)]">
            Primary
          </span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--hq-text-muted)]">
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {contact.phone}
            </span>
          )}
          {!contact.email && !contact.phone && (
            <span className="text-amber-600">No email/phone yet — automated sequences can&apos;t send until one is added.</span>
          )}
        </div>
        <p className="mt-1 text-[10px] text-[var(--hq-text-muted)]">Primary contact — where automated sequence emails are sent.</p>
      </div>
      <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PersonRow({ contactId, person, onChanged }: { contactId: string; person: Person; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(person);
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Swaps this secondary person into the lead's own primary contact fields
  // (contactName/email/phone) — the only fields sequence emails actually
  // send to. The lead's previous primary becomes a new secondary person,
  // so nothing gets lost. See the makePrimary branch in the PATCH route.
  async function makePrimary() {
    if (!confirm(`Make ${person.name} the primary contact for this lead? Sequence emails will go to their address from now on.`)) return;
    setPromoting(true);
    await fetch(`/api/contacts/${contactId}/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ makePrimary: true }),
    });
    setPromoting(false);
    onChanged();
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/contacts/${contactId}/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        title: draft.title,
        email: draft.email,
        phone: draft.phone,
      }),
    });
    setSaving(false);
    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${person.name} from this lead?`)) return;
    await fetch(`/api/contacts/${contactId}/people/${person.id}`, { method: "DELETE" });
    onChanged();
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-[var(--hq-card-border)] p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputCls} placeholder="Title" value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <input className={inputCls} placeholder="Phone" value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={save} disabled={saving} className="rounded-md bg-[var(--hq-text)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => { setDraft(person); setEditing(false); }} className="text-xs text-[var(--hq-text-muted)]">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--hq-card-border)] p-3">
      <div>
        <p className="text-sm font-medium text-[var(--hq-text)]">
          {person.name}
          {person.title && <span className="font-normal text-[var(--hq-text-muted)]"> · {person.title}</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--hq-text-muted)]">
          {person.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {person.email}
            </span>
          )}
          {person.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {person.phone}
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] text-[var(--hq-text-muted)]">Secondary contact — not used for automated sequence emails.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={makePrimary}
          disabled={promoting || !person.email}
          title={person.email ? "Make this the lead's primary contact" : "Add an email first"}
          className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-accent)] disabled:opacity-40"
        >
          <Star className="h-3.5 w-3.5" /> {promoting ? "Making primary…" : "Make primary"}
        </button>
        <button onClick={() => setEditing(true)} className="text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
          Edit
        </button>
        <button onClick={remove} className="text-[var(--hq-text-muted)] hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Lets a lead carry more than one email/stakeholder — a venue's events
// manager AND their finance contact, say. Every person's email is also
// matched against the Gmail history backfill and live inbox sync (see
// crm-contact.ts), so a message to/from any of them still shows up on
// this lead's timeline below.
//
// But only ONE address is ever a send target for automated sequence
// emails: the lead's own primary contactName/email/phone (shown in the
// header and Details above) — never a person listed here. These are
// secondary contacts: useful for matching conversation history, never for
// sending. Use "Make primary" on a person to swap them into that primary
// role instead (their old primary becomes a new secondary automatically).
export function PeoplePanel({ contactId, primary, people }: { contactId: string; primary: PrimaryContact; people: Person[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  function refresh() {
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--hq-text)]">
          <Users className="h-3.5 w-3.5" /> Contacts ({1 + people.length})
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--hq-accent)]"
          >
            <Plus className="h-3.5 w-3.5" /> Add person
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-[var(--hq-text-muted)]">
        Everyone at this company. The primary contact (pinned first) is who automated sequence emails go to —
        use &quot;Make primary&quot; on anyone else to swap them in; their old info becomes a secondary contact, nothing
        is lost.
      </p>

      <div className="mt-3 space-y-2">
        <PrimaryContactCard contactId={contactId} contact={primary} onChanged={refresh} />
        {people.map((p) => (
          <PersonRow key={p.id} contactId={contactId} person={p} onChanged={refresh} />
        ))}
      </div>

      {adding && <AddPersonForm contactId={contactId} onDone={refresh} />}
    </div>
  );
}
