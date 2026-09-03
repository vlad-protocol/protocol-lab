import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { DocsView } from "./docs-view";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  await requireAccess("docs");

  const [docs, contacts] = await Promise.all([
    prisma.docRecord.findMany({
      include: { contact: { select: { id: true, companyName: true, contactName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <FileText className="h-6 w-6 text-[var(--hq-accent)]" />
          Docs & Sign
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Draft a document, mark it sent, and share its signing link — the
          recipient types their legal name to sign, no account needed. Good
          for internal agreements; not a certified e-signature product.
        </p>
      </div>

      <div className="mt-6">
        <DocsView
          initialDocs={docs.map((d) => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
            sentAt: d.sentAt ? d.sentAt.toISOString() : null,
            signedAt: d.signedAt ? d.signedAt.toISOString() : null,
          }))}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
