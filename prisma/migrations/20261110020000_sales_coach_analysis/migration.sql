-- Persisted Sales Coach analysis on Interaction, so takeaways survive
-- beyond one chat session and can be aggregated into a recurring-pattern
-- view (see lib/sales-coach-tags.ts for the fixed tag vocabulary).

ALTER TABLE "Interaction" ADD COLUMN "coachingNotes" TEXT;
ALTER TABLE "Interaction" ADD COLUMN "coachingStrengthTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Interaction" ADD COLUMN "coachingIssueTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Interaction" ADD COLUMN "coachingGeneratedAt" TIMESTAMP(3);
