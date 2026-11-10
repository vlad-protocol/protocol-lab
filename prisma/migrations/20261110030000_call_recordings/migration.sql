-- Audio captured live in the browser (phone on speaker) for a call made
-- from Vlad's own phone, not dialed through Twilio — see the "Record
-- live call" option on a lead's timeline.

CREATE TABLE "CallRecording" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRecording_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CallRecording" ADD CONSTRAINT "CallRecording_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
