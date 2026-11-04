import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ActivationsShell } from "./activations-shell";

export const dynamic = "force-dynamic";

export default async function ActivationsPage() {
  await requireAccess("activations");

  const [activations, wonContacts] = await Promise.all([
    prisma.activation.findMany({
      orderBy: { createdAt: "desc" },
      include: { contact: { select: { id: true, companyName: true, contactName: true } }, steps: true, payments: true },
    }),
    prisma.contact.findMany({
      where: { status: "WON", activation: null },
      select: { id: true, companyName: true, contactName: true, industry: true, dealValue: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <ActivationsShell
      activations={activations.map((a) => ({
        id: a.id,
        eventName: a.eventName,
        eventDate: a.eventDate ? a.eventDate.toISOString() : null,
        brandName: a.contact.companyName || a.contact.contactName,
        quoteTotal: a.quoteTotal,
        stepsDone: a.steps.filter((s) => s.done).length,
        stepsTotal: a.steps.length,
        paymentsReceived: a.payments.filter((p) => p.status === "RECEIVED").length,
        paymentsTotal: a.payments.length,
      }))}
      wonContacts={wonContacts}
    />
  );
}
