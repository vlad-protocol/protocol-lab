-- Adds the Sent->Inbox phase tracker to the Gmail history backfill.
ALTER TABLE "GmailConnection" ADD COLUMN "historySyncPhase" TEXT NOT NULL DEFAULT 'SENT';

-- Existing connections that already finished the OLD Sent-only backfill
-- are marked done. Since Inbox scanning is new, treat those as having
-- finished the Sent phase already and needing exactly the Inbox phase,
-- rather than either skipping Inbox forever (old behavior) or re-walking
-- all of Sent mail again from scratch.
UPDATE "GmailConnection"
SET "historySyncPhase" = 'INBOX', "historySyncDone" = false, "historySyncCursor" = NULL
WHERE "historySyncDone" = true;
