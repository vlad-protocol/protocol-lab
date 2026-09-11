-- AlterTable: visual block-editor content for EmailCampaign
ALTER TABLE "EmailCampaign" ADD COLUMN     "blocks" JSONB;
ALTER TABLE "EmailCampaign" ADD COLUMN     "settings" JSONB;

-- AlterTable: open/click tracking for EmailSend
ALTER TABLE "EmailSend" ADD COLUMN     "openedAt" TIMESTAMP(3);
ALTER TABLE "EmailSend" ADD COLUMN     "firstClickedAt" TIMESTAMP(3);
ALTER TABLE "EmailSend" ADD COLUMN     "lastClickedAt" TIMESTAMP(3);
ALTER TABLE "EmailSend" ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0;
