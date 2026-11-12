-- Live Proposal: proposal deck built live during the discovery call
-- (transcript segments + AI-extracted discovery fields + concepts).

-- CreateTable
CREATE TABLE "LiveProposal" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'New live proposal',
    "status" TEXT NOT NULL DEFAULT 'LIVE',
    "callLanguage" TEXT NOT NULL DEFAULT 'english',
    "priceTier" TEXT NOT NULL DEFAULT 'FOUNDING',
    "fields" JSONB NOT NULL DEFAULT '{}',
    "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "concepts" JSONB NOT NULL DEFAULT '[]',
    "chosenConcept" INTEGER,
    "extractCount" INTEGER NOT NULL DEFAULT 0,
    "lastExtractAt" TIMESTAMP(3),
    "lastError" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "paymentChoice" TEXT,
    "activationId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveProposalSegment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveProposalSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveProposal_contactId_idx" ON "LiveProposal"("contactId");

-- CreateIndex
CREATE INDEX "LiveProposal_createdAt_idx" ON "LiveProposal"("createdAt");

-- CreateIndex
CREATE INDEX "LiveProposalSegment_proposalId_startedAt_idx" ON "LiveProposalSegment"("proposalId", "startedAt");

-- AddForeignKey
ALTER TABLE "LiveProposal" ADD CONSTRAINT "LiveProposal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveProposalSegment" ADD CONSTRAINT "LiveProposalSegment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "LiveProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
