"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function SignForm({
  docId,
  alreadySigned,
  signerName,
  signedAt,
}: {
  docId: string;
  alreadySigned: boolean;
  signerName: string | null;
  signedAt: string | null;
}) {
  const [done, setDone] = useState(alreadySigned);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      setError("Type your full legal name and email to sign.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/docs/${docId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerName: name, signerEmail: email }),
    });
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setError("Something went wrong — try again.");
  }

  if (done) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          {alreadySigned && signerName
            ? `Already signed by ${signerName}${signedAt ? " on " + new Date(signedAt).toLocaleString() : ""}.`
            : "Signed — thanks."}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">
        Typing your name below counts as your signature on this document.
      </p>
      <input
        placeholder="Full legal name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Signing…" : "Sign document"}
      </button>
    </form>
  );
}
