import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Intentionally public — this is the endpoint the recipient's typed
// signature hits, from the /sign/[id] link, no login involved.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { signerName, signerEmail } = body as { signerName?: string; signerEmail?: string };
  if (!signerName || !signerEmail) {
    return NextResponse.json({ error: "signerName and signerEmail are required." }, { status: 400 });
  }

  const existing = await prisma.docRecord.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.status === "SIGNED") {
    return NextResponse.json({ doc: existing });
  }

  const doc = await prisma.docRecord.update({
    where: { id },
    data: { status: "SIGNED", signerName, signerEmail, signedAt: new Date() },
  });
  return NextResponse.json({ doc });
}
