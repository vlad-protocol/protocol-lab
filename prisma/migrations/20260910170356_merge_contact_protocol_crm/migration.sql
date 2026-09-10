-- Merge the two separate CRMs ("People" / Contact, and "Protocol CRM" /
-- ProtocolLead) into one Contact table. Every existing row from both
-- tables is preserved; nothing is dropped without first being copied
-- forward. See prisma/schema.prisma for the resulting shape.

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'SPONSOR', 'VENUE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFYING', 'PROPOSAL_SENT', 'NEGOTIATING', 'FOLLOW_UP_SCHEDULED', 'WON', 'LOST', 'ON_HOLD');
CREATE TYPE "LeadPriority" AS ENUM ('HOT', 'WARM', 'COLD');

-- Add the new Contact columns first (nullable/defaulted so existing rows
-- stay valid) — old columns are kept alongside them for now so their data
-- can be backfilled before anything is dropped.
ALTER TABLE "Contact"
  ADD COLUMN "number" SERIAL NOT NULL,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "type" "ContactType" NOT NULL DEFAULT 'CLIENT',
  ADD COLUMN "status_new" "LeadStatus",
  ADD COLUMN "priority" "LeadPriority",
  ADD COLUMN "source" TEXT,
  ADD COLUMN "assignedRep_new" TEXT,
  ADD COLUMN "dateFirstContacted" TIMESTAMP(3),
  ADD COLUMN "lastContactDate" TIMESTAMP(3),
  ADD COLUMN "totalTouches" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eventOpportunity" TEXT,
  ADD COLUMN "dealValue" DOUBLE PRECISION,
  ADD COLUMN "followUpOwner" TEXT,
  ADD COLUMN "nextStep" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill status for existing People contacts onto the new pipeline stages.
UPDATE "Contact" SET "status_new" = CASE "status"
  WHEN 'LEAD' THEN 'NEW'::"LeadStatus"
  WHEN 'ACTIVE' THEN 'CONTACTED'::"LeadStatus"
  WHEN 'CLIENT' THEN 'WON'::"LeadStatus"
  WHEN 'CLOSED' THEN 'LOST'::"LeadStatus"
  ELSE 'NEW'::"LeadStatus"
END;

-- Backfill assignedRep as free text from the old User relation.
UPDATE "Contact" c SET "assignedRep_new" = u."name"
FROM "User" u WHERE c."assignedRepId" = u."id" AND u."name" IS NOT NULL;
UPDATE "Contact" c SET "assignedRep_new" = u."email"
FROM "User" u WHERE c."assignedRepId" = u."id" AND c."assignedRep_new" IS NULL;

-- Carry the AI "suggested next step" field over into the unified nextStep column.
UPDATE "Contact" SET "nextStep" = "suggestedNextStep" WHERE "suggestedNextStep" IS NOT NULL;

-- Drop the old FK + columns now that their data has been preserved above.
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_assignedRepId_fkey";
ALTER TABLE "Contact" DROP COLUMN "assignedRepId";
ALTER TABLE "Contact" DROP COLUMN "suggestedNextStep";
ALTER TABLE "Contact" DROP COLUMN "status";
ALTER TABLE "Contact" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Contact" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "status" SET DEFAULT 'NEW';
ALTER TABLE "Contact" RENAME COLUMN "assignedRep_new" TO "assignedRep";

-- Migrate every Protocol CRM lead into the unified Contact table.
INSERT INTO "Contact" (
  "id", "companyName", "contactName", "title", "email", "phone", "website", "industry",
  "type", "status", "priority", "tags", "source", "assignedRep",
  "dateFirstContacted", "lastContactDate", "totalTouches", "eventOpportunity", "dealValue",
  "followUpOwner", "notes", "createdById", "createdAt", "updatedAt",
  "lastConversationSummary", "nextStep", "nextFollowUpDate"
)
SELECT
  "id",
  "companyName",
  COALESCE("contactName", "companyName"),
  "contactTitle",
  "email",
  "phone",
  "website",
  "industry",
  "leadType"::text::"ContactType",
  "status"::text::"LeadStatus",
  "priority"::text::"LeadPriority",
  '{}',
  "source",
  "assignedRep",
  "dateFirstContacted",
  "lastContactDate",
  "totalTouches",
  "eventOpportunity",
  "dealValue",
  "followUpOwner",
  "notes",
  NULL,
  "createdAt",
  "updatedAt",
  "lastConversationSummary",
  "nextStep",
  "nextFollowUpDate"
FROM "ProtocolLead";

-- Drop the old Protocol CRM table + its now-unused enums.
DROP TABLE "ProtocolLead";
DROP TYPE "ContactStatus";
DROP TYPE "ProtocolLeadPriority";
DROP TYPE "ProtocolLeadStatus";
DROP TYPE "ProtocolLeadType";

-- CreateIndex
CREATE UNIQUE INDEX "Contact_number_key" ON "Contact"("number");
CREATE INDEX "Contact_status_idx" ON "Contact"("status");
CREATE INDEX "Contact_type_idx" ON "Contact"("type");
CREATE INDEX "Contact_nextFollowUpDate_idx" ON "Contact"("nextFollowUpDate");
