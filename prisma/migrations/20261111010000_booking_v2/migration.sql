-- Booking v2: replaces the unused v1 Booking tables (Availability was
-- global/unowned, BookingRequest was a manual request/approve flow with
-- no event types, questions, or calendar sync) with a Calendly-style
-- system — per-host weekly availability, event types with optional
-- qualification questions, instant-confirm bookings, Google Calendar
-- sync, and reminder rules. Both old tables are empty in production (the
-- v1 feature was never actually used), so this drops/recreates rather
-- than migrating data.

-- CreateEnum
CREATE TYPE "BookingQuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'RADIO', 'CHECKBOX', 'DROPDOWN', 'PHONE');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'SMS');

-- DropTable (old v1 request/approve flow, unused — see note above)
DROP TABLE "BookingRequest";

-- DropEnum (old PENDING/CONFIRMED/DECLINED set, replaced below)
DROP TYPE "BookingStatus";

-- CreateEnum (new CONFIRMED/CANCELED set — booking is instant now, not
-- request/approve, so there's no PENDING state; DECLINED becomes CANCELED)
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_createdById_fkey";

-- DropIndex
DROP INDEX "Availability_dayOfWeek_idx";

-- AlterTable: Availability becomes per-host. Old rows (if any — this was
-- an unused global/unowned v1 feature) have no host to attribute to, so
-- they're cleared rather than left dangling.
DELETE FROM "Availability";
ALTER TABLE "Availability" DROP COLUMN "createdById",
ADD COLUMN     "hostUserId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BookingEventType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hostUserId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "requiresQuestions" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "dailyLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingEventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingQuestion" (
    "id" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "BookingQuestionType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BookingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "googleEventId" TEXT,
    "contactId" TEXT,
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAnswer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "BookingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingReminder" (
    "id" TEXT NOT NULL,
    "eventTypeId" TEXT,
    "minutesBefore" INTEGER NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingReminderLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingEventType_slug_key" ON "BookingEventType"("slug");

-- CreateIndex
CREATE INDEX "BookingEventType_hostUserId_idx" ON "BookingEventType"("hostUserId");

-- CreateIndex
CREATE INDEX "BookingQuestion_eventTypeId_order_idx" ON "BookingQuestion"("eventTypeId", "order");

-- CreateIndex
CREATE INDEX "Booking_hostUserId_startsAt_idx" ON "Booking"("hostUserId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_eventTypeId_startsAt_idx" ON "Booking"("eventTypeId", "startsAt");

-- CreateIndex
CREATE INDEX "BookingAnswer_bookingId_idx" ON "BookingAnswer"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingReminderLog_bookingId_reminderId_key" ON "BookingReminderLog"("bookingId", "reminderId");

-- CreateIndex
CREATE INDEX "Availability_hostUserId_dayOfWeek_idx" ON "Availability"("hostUserId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEventType" ADD CONSTRAINT "BookingEventType_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQuestion" ADD CONSTRAINT "BookingQuestion_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "BookingEventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "BookingEventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAnswer" ADD CONSTRAINT "BookingAnswer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAnswer" ADD CONSTRAINT "BookingAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BookingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReminderLog" ADD CONSTRAINT "BookingReminderLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReminderLog" ADD CONSTRAINT "BookingReminderLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "BookingReminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReminder" ADD CONSTRAINT "BookingReminder_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "BookingEventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BookingReminder_eventTypeId_idx" ON "BookingReminder"("eventTypeId");
