import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { LiveConsole } from "./console";

export const dynamic = "force-dynamic";

export default async function LiveProposalConsolePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("live_proposal");
  const { id } = await params;
  const p = await prisma.liveProposal.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!p) notFound();
  return <LiveConsole id={p.id} initialTitle={p.title} />;
}
