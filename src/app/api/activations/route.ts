import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ACTIVATION_TIMELINE_TEMPLATE, computeStepDates } from "@/lib/activation-timeline";
import { seedContentAssets } from "@/lib/activation-content-assets";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activations = await prisma.activation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { id: true, companyName: true, contactName: true, status: true } },
      steps: { orderBy: { stepNumber: "asc" } },
      payments: true,
    },
  });
  return NextResponse.json({ activations });
}

// Create an Activation for an already-won Contact. Seeds all 17 SOP
// timeline steps immediately — eventDate may be null at this point, in
// which case the steps are created with no dueDate and can be
// recomputed later via PATCH on the Activation once the date is set.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { contactId?: string; eventName?: string; eventDate?: string | null };
  if (!body.contactId || !body.eventName) {
    return NextResponse.json({ error: "contactId and eventName are required." }, { status: 400 });
  }

  const contact = await prisma.contact.findUnique({ where: { id: body.contactId } });
  if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  const existing = await prisma.activation.findUnique({ where: { contactId: body.contactId } });
  if (existing) return NextResponse.json({ error: "This lead already has an Activation." }, { status: 409 });

  const eventDate = body.eventDate ? new Date(body.eventDate) : null;
  const dates = computeStepDates(eventDate);

  const activation = await prisma.activation.create({
    data: {
      contactId: body.contactId,
      eventName: body.eventName,
      eventDate,
      mainSponsorCategory: contact.industry || null,
      contentAssets: seedContentAssets() as object,
      createdById: session.user.id,
      steps: {
        create: ACTIVATION_TIMELINE_TEMPLATE.map((s) => ({
          stepNumber: s.stepNumber,
          phase: s.phase,
          title: s.title,
          owner: s.owner,
          doneWhen: s.doneWhen,
          dueDate: dates.get(s.stepNumber) || null,
        })),
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  return NextResponse.json({ activation });
}
