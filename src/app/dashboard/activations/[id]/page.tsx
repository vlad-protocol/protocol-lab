import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ActivationDetail } from "./activation-detail";

export const dynamic = "force-dynamic";

export default async function ActivationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("activations");
  const { id } = await params;

  const activation = await prisma.activation.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, companyName: true, contactName: true, industry: true } },
      steps: { orderBy: { stepNumber: "asc" } },
      sponsors: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!activation) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/activations" className="flex items-center gap-1 text-xs text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]">
        <ArrowLeft className="h-3.5 w-3.5" /> All activations
      </Link>
      <ActivationDetail
        activation={{
          ...activation,
          eventDate: activation.eventDate ? activation.eventDate.toISOString() : null,
          gate1PassedAt: activation.gate1PassedAt ? activation.gate1PassedAt.toISOString() : null,
          gate2PassedAt: activation.gate2PassedAt ? activation.gate2PassedAt.toISOString() : null,
          createdAt: activation.createdAt.toISOString(),
          updatedAt: activation.updatedAt.toISOString(),
          costLineItems: activation.costLineItems as unknown,
          contentAssets: (activation.contentAssets as never) || [],
          steps: activation.steps.map((s) => ({ ...s, dueDate: s.dueDate ? s.dueDate.toISOString() : null })),
          payments: activation.payments.map((p) => ({ ...p, dueDate: p.dueDate ? p.dueDate.toISOString() : null })),
        }}
      />
    </div>
  );
}
