import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveProposalSession } from "@/lib/live-proposal-auth";
import type { Fields } from "@/lib/live-proposal";

export async function GET() {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const proposals = await prisma.liveProposal.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { contact: { select: { id: true, companyName: true, contactName: true } } },
  });
  return NextResponse.json({ proposals });
}

// Start a live proposal, optionally tied to a CRM lead (prefills the
// owner and studio name from the Contact so the deck has them from
// minute one).
export async function POST(req: Request) {
  const { session, denied } = await liveProposalSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { contactId?: string | null; title?: string; callLanguage?: string };

  let fields: Fields = {};
  let title = body.title?.trim() || "New live proposal";
  if (body.contactId) {
    const c = await prisma.contact.findUnique({ where: { id: body.contactId } });
    if (!c) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    fields = {
      ...(c.contactName ? { ownerName: { value: c.contactName } } : {}),
      ...(c.title ? { ownerTitle: { value: c.title } } : {}),
      ...(c.companyName ? { studioName: { value: c.companyName } } : {}),
    };
    if (!body.title) title = c.companyName || c.contactName;
  }

  const proposal = await prisma.liveProposal.create({
    data: {
      contactId: body.contactId || null,
      title,
      callLanguage: body.callLanguage === "french" ? "french" : "english",
      fields: fields as object,
      createdById: session!.user.id,
    },
  });
  return NextResponse.json({ proposal });
}
