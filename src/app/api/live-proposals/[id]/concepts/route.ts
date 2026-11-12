import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveProposalSession } from "@/lib/live-proposal-auth";
import { generateConcepts, transcriptText, type Fields } from "@/lib/live-proposal";

// Drafts 3 concepts from the call so far. Replaces any earlier set and
// picks the first (strongest) one; the console can switch with one click.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;
  const p = await prisma.liveProposal.findUnique({ where: { id }, include: { segments: { orderBy: { startedAt: "asc" } } } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const concepts = await generateConcepts(transcriptText(p.segments), p.fields as Fields);
    const updated = await prisma.liveProposal.update({
      where: { id },
      data: { concepts: concepts as object, chosenConcept: 0, lastError: null },
    });
    return NextResponse.json({ concepts: updated.concepts, chosenConcept: 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Concept generation failed.";
    await prisma.liveProposal.update({ where: { id }, data: { lastError: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
