-- CreateEnum
CREATE TYPE "ListSource" AS ENUM ('MANUAL', 'FORM');

-- AlterTable
ALTER TABLE "EmailSend" ADD COLUMN     "listMemberId" TEXT;

-- AlterTable
ALTER TABLE "SmsSend" ADD COLUMN     "listMemberId" TEXT;

-- CreateTable
CREATE TABLE "ProtocolListMember" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" "ListSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolListMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProtocolListMember_email_idx" ON "ProtocolListMember"("email");

-- CreateIndex
CREATE INDEX "ProtocolListMember_phone_idx" ON "ProtocolListMember"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSend_campaignId_listMemberId_key" ON "EmailSend"("campaignId", "listMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsSend_campaignId_listMemberId_key" ON "SmsSend"("campaignId", "listMemberId");

-- AddForeignKey
ALTER TABLE "EmailSend" ADD CONSTRAINT "EmailSend_listMemberId_fkey" FOREIGN KEY ("listMemberId") REFERENCES "ProtocolListMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsSend" ADD CONSTRAINT "SmsSend_listMemberId_fkey" FOREIGN KEY ("listMemberId") REFERENCES "ProtocolListMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolListMember" ADD CONSTRAINT "ProtocolListMember_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

