-- AlterEnum
ALTER TYPE "SequenceEnrollmentStatus" ADD VALUE 'AWAITING_CONFIRMATION';

-- AlterTable
ALTER TABLE "EmailSequence" ADD COLUMN "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EmailSequenceStep" ADD COLUMN "researchAngle" TEXT;

-- CreateEnum
CREATE TYPE "SequenceDraftStatus" AS ENUM ('PENDING', 'SENT', 'REJECTED');

-- CreateTable
CREATE TABLE "SequenceStepDraft" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "researchNotes" TEXT,
    "status" "SequenceDraftStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "SequenceStepDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SequenceStepDraft_enrollmentId_stepOrder_key" ON "SequenceStepDraft"("enrollmentId", "stepOrder");

CREATE INDEX "SequenceStepDraft_status_idx" ON "SequenceStepDraft"("status");

ALTER TABLE "SequenceStepDraft" ADD CONSTRAINT "SequenceStepDraft_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SequenceEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SequenceStepDraft" ADD CONSTRAINT "SequenceStepDraft_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
