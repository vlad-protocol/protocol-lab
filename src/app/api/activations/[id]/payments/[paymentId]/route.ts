import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Marking a payment RECEIVED creates a real CFOTransaction (income,
// category "protocol-income") so the money shows up in the existing CFO
// module instead of living only on the Activation. INVOICED just tracks
// that a bill went out — no CFO row yet, since nothing's landed.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, paymentId } = await params;
  const payment = await prisma.activationPayment.findFirst({ where: { id: paymentId, activationId: id } });
  if (!payment) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { status?: "PLANNED" | "INVOICED" | "RECEIVED"; dueDate?: string | null };
  const data: Record<string, unknown> = {};
  if ("dueDate" in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  if (body.status === "RECEIVED" && payment.status !== "RECEIVED") {
    if (!payment.cfoTransactionId) {
      const activation = await prisma.activation.findUnique({ where: { id }, include: { contact: true } });
      const txn = await prisma.cFOTransaction.create({
        data: {
          userId: session.user.id,
          date: new Date(),
          description: `${activation?.contact.companyName || activation?.eventName || "Activation"} — ${payment.label}`,
          amount: payment.amount,
          type: "INCOME",
          category: "protocol-income",
          pending: false,
        },
      });
      data.cfoTransactionId = txn.id;
    }
    data.status = "RECEIVED";
  } else if (body.status === "INVOICED" || body.status === "PLANNED") {
    data.status = body.status;
  }

  const updated = await prisma.activationPayment.update({ where: { id: paymentId }, data });
  return NextResponse.json({ payment: updated });
}
