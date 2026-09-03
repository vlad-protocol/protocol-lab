import Link from "next/link";
import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { getSession as auth } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TwilioConnectCard } from "./twilio-connect-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const twilio = await prisma.twilioConnection.findFirst({ orderBy: { connectedAt: "desc" } });

  return (
    <div className="max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
        <SettingsIcon className="h-6 w-6 text-[var(--hq-text-muted)]" />
        Settings
      </h1>

      {session.user.role === "OWNER" && (
        <>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-[var(--hq-text-muted)]">
            Twilio (texting &amp; calls — shared business line)
          </p>
          <TwilioConnectCard
            connected={!!twilio}
            phoneNumber={twilio?.phoneNumber || null}
          />

          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <strong>Before you turn on call recording:</strong> consent rules for recording
            phone calls vary by country and by US state — some places require telling the
            other party, some require their explicit consent before you record. Confirm
            what applies to where you and your contacts are before relying on this.
          </p>

          <div className="mt-6 rounded-xl border border-[var(--hq-card-border)] bg-white p-4">
            <p className="text-sm font-medium text-[var(--hq-text)]">Gmail (per teammate)</p>
            <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
              Each person connects their own Gmail from the{" "}
              <Link href="/dashboard/mail" className="text-[var(--hq-accent)] hover:underline">
                Mail page
              </Link>{" "}
              — that way email sent through the CRM comes from them, not a shared account.
              To make that available at all, Protocol Lab's deployment needs Google OAuth
              credentials set as environment variables (GOOGLE_CLIENT_ID,
              GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) — see the README for the exact
              steps in Google Cloud Console.
            </p>
          </div>

          <Link
            href="/dashboard/settings/team"
            className="mt-6 flex items-center justify-between rounded-xl border border-[var(--hq-card-border)] bg-white p-4 hover:border-[var(--hq-accent)]"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--hq-text)]">
              <ShieldCheck className="h-4 w-4 text-[var(--hq-accent)]" />
              Team &amp; permissions
            </span>
            <span className="text-xs text-[var(--hq-text-muted)]">
              Invite teammates, control what each of them can see →
            </span>
          </Link>
        </>
      )}

      {session.user.role === "EMPLOYEE" && (
        <p className="mt-6 text-sm text-[var(--hq-text-muted)]">
          Twilio and team permissions are managed by the owner. You can connect your own
          Gmail from the{" "}
          <Link href="/dashboard/mail" className="text-[var(--hq-accent)] hover:underline">
            Mail page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
