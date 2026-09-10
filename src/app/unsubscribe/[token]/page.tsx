import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = verifyUnsubscribeToken(token);

  if (!email) {
    return (
      <Shell>
        <p className="text-sm text-neutral-600">This unsubscribe link is invalid or expired.</p>
      </Shell>
    );
  }

  await prisma.emailSuppression.upsert({
    where: { email },
    update: { reason: "UNSUBSCRIBE" },
    create: { email, reason: "UNSUBSCRIBE" },
  });

  return (
    <Shell>
      <p className="text-sm text-neutral-600">
        <span className="font-medium text-neutral-900">{email}</span> has been unsubscribed. You
        won&apos;t receive any more mass emails from us.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">Unsubscribe</h1>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
