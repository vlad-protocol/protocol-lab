-- Sales dashboard (call-tracking metrics) — see /dashboard/sales.
-- Adds a per-call outcome tag so the dashboard can compute calls made,
-- connect rate, voicemails, demos booked, and reschedules, grouped by
-- rep and by day, straight from the existing Interaction log (no
-- separate call-logging flow — reps keep logging calls the same way
-- they already do on a lead's Communication Log).

CREATE TYPE "CallOutcome" AS ENUM ('NO_ANSWER', 'VOICEMAIL', 'CONNECTED_NOT_BOOKED', 'DEMO_BOOKED', 'RESCHEDULED');

ALTER TABLE "Interaction" ADD COLUMN "callOutcome" "CallOutcome";

-- Quick-access sales scripts (cold call, demo call, objections, etc.)
CREATE TABLE "SalesScript" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesScript_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesScript_category_sortOrder_idx" ON "SalesScript"("category", "sortOrder");

ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
