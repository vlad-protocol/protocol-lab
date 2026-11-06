import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession as auth } from "@/lib/session";

// This page always checks the database, so it can't be statically
// prerendered at build time (there's no DB available during the build).
export const dynamic = "force-dynamic";

// A public landing page, not gated by login, so this URL can serve as
// the OAuth consent screen's "Application home page" — Google requires
// that page to explain the app's purpose without requiring sign-in.
// Signed-in users (or a fresh install) are bounced straight through.
export default async function Home() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 py-16 text-neutral-900">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Protocol Lab</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Protocol Lab is Protocol&apos;s internal command center for its brand-activation events business —
          a private CRM, cost-sheet and timeline tool, and email workspace used only by Protocol&apos;s own
          team to manage leads, signed brand deals, and client communications. It is not a public product
          or service.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Team sign in
        </Link>
        <p className="mt-8 text-xs text-neutral-400">
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
          {" · "}
          <Link href="/terms" className="underline">
            Terms of service
          </Link>
        </p>
      </div>
    </main>
  );
}
