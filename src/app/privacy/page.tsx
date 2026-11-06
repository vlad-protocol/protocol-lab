export const metadata = { title: "Privacy Policy — Protocol Lab" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-900">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated November 2026</p>

      <p className="mt-6 text-sm leading-6 text-neutral-700">
        Protocol Lab is an internal business tool built and operated by Protocol (Montreal) for its own team
        to manage leads, brand-event deals, email, and related operations. It is not offered to the public
        as a product or service.
      </p>

      <h2 className="mt-8 text-base font-semibold">What we access</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Protocol Lab connects to Google services (such as Gmail) only for accounts belonging to Protocol&apos;s
        own team, and only to send and read email on behalf of those team members for business purposes —
        for example, logging sponsor and client correspondence into the CRM, and sending outreach or
        confirmation emails that a team member initiates or approves.
      </p>

      <h2 className="mt-8 text-base font-semibold">How data is used</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Data accessed through connected accounts (such as email content related to leads and clients) is
        used solely to operate Protocol Lab for Protocol&apos;s internal CRM, communications, and reporting.
        It is never sold, shared with third parties for advertising, or used for any purpose outside
        operating this internal tool.
      </p>

      <h2 className="mt-8 text-base font-semibold">Data retention & access</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Data is stored in Protocol Lab&apos;s private database and is accessible only to authorized Protocol
        team members who are signed in. Connected-account access can be revoked at any time from the
        account&apos;s Google settings or from within Protocol Lab.
      </p>

      <h2 className="mt-8 text-base font-semibold">Contact</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Questions about this policy can be sent to the Protocol team at protocolevnts@gmail.com.
      </p>
    </main>
  );
}
