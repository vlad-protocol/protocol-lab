import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveProposalSession } from "@/lib/live-proposal-auth";
import { transcribeLiveChunk } from "@/lib/integrations/assemblyai";

const MAX_BYTES = 5 * 1024 * 1024;

// One ~15s audio chunk from the console: speaker REP (mic) or CLIENT
// (shared Meet tab). Transcribed in-process, saved as a segment. Silent
// chunks come back empty and aren't saved.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await liveProposalSession();
  if (denied) return denied;
  const { id } = await params;

  const proposal = await prisma.liveProposal.findUnique({ where: { id }, select: { id: true, callLanguage: true } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("audio");
  const speaker = form.get("speaker") === "CLIENT" ? "CLIENT" : "REP";
  const startedAtRaw = Number(form.get("startedAt"));
  const startedAt = Number.isFinite(startedAtRaw) && startedAtRaw > 0 ? new Date(startedAtRaw) : new Date();
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ text: "" });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Chunk too large." }, { status: 400 });

  try {
    const text = await transcribeLiveChunk(Buffer.from(await file.arrayBuffer()), proposal.callLanguage === "french" ? "french" : "english");
    if (!text) return NextResponse.json({ text: "" });
    const segment = await prisma.liveProposalSegment.create({ data: { proposalId: id, speaker, text, startedAt } });
    return NextResponse.json({ text, segment });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Transcription failed." }, { status: 500 });
  }
}
