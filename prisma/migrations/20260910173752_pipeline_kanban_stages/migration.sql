-- Replace the pipeline stages with the Kanban board columns: New Lead,
-- Contacted Once, 1st Follow Up, Second Follow Up, Last Follow Up, Stale,
-- 1st Meeting Booked, Negotiations, Won, Lost. Every existing lead's
-- status is remapped onto the closest new stage rather than reset.

CREATE TYPE "LeadStatusNew" AS ENUM ('NEW_LEAD', 'CONTACTED_ONCE', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP_LAST', 'STALE', 'MEETING_BOOKED', 'NEGOTIATING', 'WON', 'LOST');

ALTER TABLE "Contact" ADD COLUMN "status_new2" "LeadStatusNew";

UPDATE "Contact" SET "status_new2" = CASE "status"
  WHEN 'NEW' THEN 'NEW_LEAD'::"LeadStatusNew"
  WHEN 'CONTACTED' THEN 'CONTACTED_ONCE'::"LeadStatusNew"
  WHEN 'QUALIFYING' THEN 'FOLLOW_UP_1'::"LeadStatusNew"
  WHEN 'PROPOSAL_SENT' THEN 'FOLLOW_UP_2'::"LeadStatusNew"
  WHEN 'FOLLOW_UP_SCHEDULED' THEN 'FOLLOW_UP_LAST'::"LeadStatusNew"
  WHEN 'NEGOTIATING' THEN 'NEGOTIATING'::"LeadStatusNew"
  WHEN 'WON' THEN 'WON'::"LeadStatusNew"
  WHEN 'LOST' THEN 'LOST'::"LeadStatusNew"
  WHEN 'ON_HOLD' THEN 'STALE'::"LeadStatusNew"
  ELSE 'NEW_LEAD'::"LeadStatusNew"
END;

ALTER TABLE "Contact" DROP COLUMN "status";
ALTER TABLE "Contact" RENAME COLUMN "status_new2" TO "status";
ALTER TABLE "Contact" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "status" SET DEFAULT 'NEW_LEAD';

DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatusNew" RENAME TO "LeadStatus";

CREATE INDEX "Contact_status_idx" ON "Contact"("status");
