import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveProposalSession } from "@/lib/live-proposal-auth";
import { FIELD_DEFS, PRICE_TIERS, type Fields } from "@/lib/live-proposal";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;
  const proposal = await prisma.liveProposal.findUnique({
    where: { id },
    include: {
      segments: { orderBy: { startedAt: "asc" } },
      contact: { select: { id: true, companyName: true, contactName: true } },
    },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ proposal });
}

// Edits from the console. Setting a field by hand locks it, so the next
// AI extraction pass can't overwrite what a person typed; `unlock` hands
// it back to the AI.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json()) as {
    field?: { key: string; value: string };
    unlock?: string;
    chosenConcept?: number | null;
    priceTier?: string;
    callLanguage?: string;
    status?: string;
    title?: string;
  };
  const current = await prisma.liveProposal.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  let locked = [...current.lockedFields];
  if (body.field && FIELD_DEFS.some((f) => f.key === body.field!.key)) {
    const fields = { ...(current.fields as Fields) };
    const v = body.field.value.trim();
    if (v) fields[body.field.key] = { value: v };
    else delete fields[body.field.key];
    data.fields = fields;
    if (!locked.includes(body.field.key)) locked.push(body.field.key);
  }
  if (body.unlock) locked = locked.filter((k) => k !== body.unlock);
  data.lockedFields = locked;
  if (body.chosenConcept !== undefined) data.chosenConcept = body.chosenConcept;
  if (body.priceTier && body.priceTier in PRICE_TIERS) data.priceTier = body.priceTier;
  if (body.callLanguage === "english" || body.callLanguage === "french") data.callLanguage = body.callLanguage;
  if (body.status === "LIVE" || body.status === "DONE") data.status = body.status;
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();

  const proposal = await prisma.liveProposal.update({ where: { id }, data });
  return NextResponse.json({ proposal });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;
  await prisma.liveProposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
