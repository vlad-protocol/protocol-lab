-- AlterTable: ActivationStep gets a phase tag (A-E) for the Playbook's
-- 4-phase-plus-recap timeline grouping.
ALTER TABLE "ActivationStep" ADD COLUMN "phase" TEXT NOT NULL DEFAULT '';

-- AlterTable: Activation gets the Playbook's raw recap-measurement
-- inputs (show-up/trial/opt-in rate, content value, offer code) and a
-- content-asset checklist.
ALTER TABLE "Activation" ADD COLUMN "rsvpCount" INTEGER;
ALTER TABLE "Activation" ADD COLUMN "productsTriedCount" INTEGER;
ALTER TABLE "Activation" ADD COLUMN "optInCount" INTEGER;
ALTER TABLE "Activation" ADD COLUMN "contentCpm" DOUBLE PRECISION;
ALTER TABLE "Activation" ADD COLUMN "offerCode" TEXT;
ALTER TABLE "Activation" ADD COLUMN "contentAssets" JSONB NOT NULL DEFAULT '[]';
