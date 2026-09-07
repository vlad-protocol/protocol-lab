-- CreateEnum
CREATE TYPE "ProtocolLeadType" AS ENUM ('SPONSOR', 'VENUE');

-- CreateEnum
CREATE TYPE "ProtocolLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFYING', 'PROPOSAL_SENT', 'NEGOTIATING', 'FOLLOW_UP_SCHEDULED', 'WON', 'LOST', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ProtocolLeadPriority" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateTable
CREATE TABLE "ProtocolLead" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "leadType" "ProtocolLeadType" NOT NULL,
    "industry" TEXT,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "source" TEXT,
    "assignedRep" TEXT,
    "priority" "ProtocolLeadPriority",
    "status" "ProtocolLeadStatus" NOT NULL DEFAULT 'NEW',
    "dateFirstContacted" TIMESTAMP(3),
    "lastContactDate" TIMESTAMP(3),
    "totalTouches" INTEGER NOT NULL DEFAULT 0,
    "lastConversationSummary" TEXT,
    "nextStep" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "followUpOwner" TEXT,
    "eventOpportunity" TEXT,
    "dealValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolLead_number_key" ON "ProtocolLead"("number");

-- CreateIndex
CREATE INDEX "ProtocolLead_status_idx" ON "ProtocolLead"("status");

-- CreateIndex
CREATE INDEX "ProtocolLead_leadType_idx" ON "ProtocolLead"("leadType");

-- CreateIndex
CREATE INDEX "ProtocolLead_nextFollowUpDate_idx" ON "ProtocolLead"("nextFollowUpDate");
