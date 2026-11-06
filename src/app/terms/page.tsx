export const metadata = { title: "Terms of Service — Protocol Lab" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-900">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated November 2026</p>

      <p className="mt-6 text-sm leading-6 text-neutral-700">
        Protocol Lab is a private, internal tool built and operated by Protocol (Montreal) for use by its
        own team only. It is not available for signup or use by the general public.
      </p>

      <h2 className="mt-8 text-base font-semibold">Use of the service</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Access is limited to individuals authorized by Protocol. Accounts and any connected third-party
        services (such as Gmail) are to be used only for Protocol&apos;s business operations — managing
        leads, brand-event deals, communications, and related recordkeeping.
      </p>

      <h2 className="mt-8 text-base font-semibold">No warranty</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Protocol Lab is provided as an internal operational tool on an &quot;as is&quot; basis, without warranty
        of any kind, for use solely by Protocol&apos;s own team.
      </p>

      <h2 className="mt-8 text-base font-semibold">Changes</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        These terms may be updated from time to time as the tool evolves. Continued use after an update
        means acceptance of the revised terms.
      </p>

      <h2 className="mt-8 text-base font-semibold">Contact</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Questions can be sent to protocolevnts@gmail.com.
      </p>
    </main>
  );
}
