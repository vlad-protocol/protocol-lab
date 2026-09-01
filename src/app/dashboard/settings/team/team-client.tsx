"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { MODULES } from "@/lib/permissions";

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "EMPLOYEE";
  permissions: string[];
  createdAt: string;
};

export function TeamClient({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: TeamUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", permissions: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const [tempCred, setTempCred] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleInvitePermission(key: string) {
    setInviteForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Something went wrong.");
      return;
    }
    setTempCred({ email: d.user.email, tempPassword: d.tempPassword });
    setUsers((u) => [
      ...u,
      {
        id: d.user.id,
        name: d.user.name,
        email: d.user.email,
        role: "EMPLOYEE",
        permissions: inviteForm.permissions,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInviteForm({ name: "", email: "", permissions: [] });
    setShowInvite(false);
  }

  async function updatePermission(userId: string, key: string, checked: boolean) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const permissions = checked
      ? [...user.permissions, key]
      : user.permissions.filter((p) => p !== key);
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, permissions } : x)));
    await fetch(`/api/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this teammate's access? Their logged calls/emails/texts stay in the CRM.")) return;
    await fetch(`/api/team/${userId}`, { method: "DELETE" });
    setUsers((u) => u.filter((x) => x.id !== userId));
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowInvite((s) => !s)}
        className="rounded-full bg-[var(--hq-accent)] px-4 py-1.5 text-sm font-medium text-white"
      >
        {showInvite ? "Close" : "Invite teammate"}
      </button>

      {tempCred && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">Account created for {tempCred.email}.</p>
          <p className="mt-1">
            Temporary password:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono">{tempCred.tempPassword}</code>
          </p>
          <p className="mt-1 text-xs">
            Share this with them directly (there's no email-invite system wired up yet) —
            they should sign in and you should ask them to change it isn't built yet either,
            so treat this as a password you both know for now.
          </p>
        </div>
      )}

      {showInvite && (
        <form onSubmit={handleInvite} className="mt-4 space-y-3 rounded-xl border border-[var(--hq-card-border)] bg-white p-5">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Name"
              className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="rounded-md border border-[var(--hq-card-border)] px-3 py-2 text-sm"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--hq-text-muted)]">Access</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MODULES.filter((m) => m.key !== "team").map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm text-[var(--hq-text)]">
                  <input
                    type="checkbox"
                    checked={inviteForm.permissions.includes(m.key)}
                    onChange={() => toggleInvitePermission(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={submitting} className="rounded-md bg-[var(--hq-text)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--hq-text)]">
                  {u.name || u.email}{" "}
                  <span className="rounded bg-[var(--hq-canvas)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--hq-text-muted)]">
                    {u.role}
                  </span>
                </p>
                <p className="text-xs text-[var(--hq-text-muted)]">{u.email}</p>
              </div>
              {u.role === "EMPLOYEE" && u.id !== currentUserId && (
                <button onClick={() => removeUser(u.id)} className="text-[var(--hq-text-muted)] hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {u.role === "OWNER" ? (
              <p className="mt-2 text-xs text-[var(--hq-text-muted)]">Full access to everything.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--hq-card-border)] pt-3">
                {MODULES.filter((m) => m.key !== "team").map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-[var(--hq-text)]">
                    <input
                      type="checkbox"
                      checked={u.permissions.includes(m.key)}
                      onChange={(e) => updatePermission(u.id, m.key, e.target.checked)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
