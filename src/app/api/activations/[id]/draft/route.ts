import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { draftProposal, draftContractExcerpt, draftReport } from "@/lib/activation-drafts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const activation = await prisma.activation.findUnique({ where: { id }, include: { contact: true } });
  if (!activation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { type?: "proposal" | "contract" | "report" };
  if (!body.type) return NextResponse.json({ error: "type is required (proposal | contract | report)." }, { status: 400 });

  const input = {
    brandName: activation.contact.companyName || activation.contact.contactName,
    contactName: activation.contact.contactName,
    eventName: activation.eventName,
    eventDate: activation.eventDate ? activation.eventDate.toISOString().slice(0, 10) : null,
    packageTier: activation.packageTier,
    quoteTotal: activation.quoteTotal,
    rules: {
      rule1Goal: activation.rule1Goal,
      rule2Connection: activation.rule2Connection,
      rule3Currency: activation.rule3Currency,
      rule4Story: activation.rule4Story,
    },
    report: {
      attendanceTarget: activation.attendanceTarget,
      attendanceActual: activation.attendanceActual,
      dayOfConversions: activation.dayOfConversions,
      revenueReported: activation.revenueReported,
      totalImpressions: activation.totalImpressions,
      referralCount: activation.referralCount,
      npsScore: activation.npsScore,
    },
  };

  let text: string;
  let field: "proposalDraft" | "contractDraft" | "reportDraft";
  try {
    if (body.type === "proposal") {
      text = await draftProposal(input);
      field = "proposalDraft";
    } else if (body.type === "contract") {
      text = await draftContractExcerpt(input);
      field = "contractDraft";
    } else {
      text = await draftReport(input);
      field = "reportDraft";
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Draft generation failed." }, { status: 502 });
  }

  const updated = await prisma.activation.update({ where: { id }, data: { [field]: text } });
  return NextResponse.json({ activation: updated });
}
