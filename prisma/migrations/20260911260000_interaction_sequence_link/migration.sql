-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN "sequenceEnrollmentId" TEXT;
ALTER TABLE "Interaction" ADD COLUMN "sequenceStepOrder" INTEGER;

CREATE INDEX "Interaction_sequenceEnrollmentId_idx" ON "Interaction"("sequenceEnrollmentId");

ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_sequenceEnrollmentId_fkey" FOREIGN KEY ("sequenceEnrollmentId") REFERENCES "SequenceEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
