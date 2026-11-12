import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveProposalSession } from "@/lib/live-proposal-auth";
import { extractFields, transcriptText, type Fields } from "@/lib/live-proposal";

// Re-reads the whole transcript and refreshes the discovery fields.
// Called by the console about once a minute while live (and by the
// "Update now" button). Skips if another pass ran in the last 8 seconds,
// so a double-click or two open consoles don't pay for two calls.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;
  const p = await prisma.liveProposal.findUnique({ where: { id }, include: { segments: { orderBy: { startedAt: "asc" } } } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.lastExtractAt && Date.now() - p.lastExtractAt.getTime() < 8000) return NextResponse.json({ skipped: true, fields: p.fields });
  if (!p.segments.length) return NextResponse.json({ skipped: true, fields: p.fields });

  await prisma.liveProposal.update({ where: { id }, data: { lastExtractAt: new Date() } });
  try {
    const fields = await extractFields(transcriptText(p.segments), p.fields as Fields, p.lockedFields);
    // Re-read locks: a person may have edited a field while Claude was thinking.
    const fresh = await prisma.liveProposal.findUnique({ where: { id }, select: { fields: true, lockedFields: true } });
    const merged: Fields = { ...fields };
    for (const k of fresh?.lockedFields || []) {
      const human = (fresh?.fields as Fields)?.[k];
      if (human) merged[k] = human;
      else delete merged[k];
    }
    const updated = await prisma.liveProposal.update({
      where: { id },
      data: { fields: merged as object, extractCount: { increment: 1 }, lastError: null },
    });
    return NextResponse.json({ fields: updated.fields });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Extraction failed.";
    await prisma.liveProposal.update({ where: { id }, data: { lastError: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
