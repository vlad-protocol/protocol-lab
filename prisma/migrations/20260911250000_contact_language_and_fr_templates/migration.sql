-- CreateEnum
CREATE TYPE "ContactLanguage" AS ENUM ('EN', 'FR');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "language" "ContactLanguage" NOT NULL DEFAULT 'EN';

-- AlterTable
ALTER TABLE "EmailSequenceStep" ADD COLUMN "subjectFr" TEXT;
ALTER TABLE "EmailSequenceStep" ADD COLUMN "bodyFr" TEXT;
