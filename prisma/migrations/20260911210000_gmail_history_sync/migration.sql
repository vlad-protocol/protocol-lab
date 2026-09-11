-- AlterTable: progress tracking for the full Sent-mail history backfill
ALTER TABLE "GmailConnection" ADD COLUMN     "historySyncCursor" TEXT;
ALTER TABLE "GmailConnection" ADD COLUMN     "historySyncDone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GmailConnection" ADD COLUMN     "historySyncProcessed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GmailConnection" ADD COLUMN     "historySyncMatched" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GmailConnection" ADD COLUMN     "historySyncStartedAt" TIMESTAMP(3);
