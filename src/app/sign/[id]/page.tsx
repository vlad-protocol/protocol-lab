import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignForm } from "./sign-form";

export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.docRecord.findUnique({ where: { id } });
  if (!doc) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">{doc.title}</h1>
      <div className="mt-6 whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-relaxed text-neutral-800">
        {doc.content}
      </div>
      <div className="mt-6">
        <SignForm
          docId={doc.id}
          alreadySigned={doc.status === "SIGNED"}
          signerName={doc.signerName}
          signedAt={doc.signedAt ? doc.signedAt.toISOString() : null}
        />
      </div>
    </div>
  );
}
