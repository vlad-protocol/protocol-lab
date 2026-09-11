-- The backfill switched from walking the SENT and INBOX labels
-- separately to a single full-mailbox pass (see gmail-history-sync.ts):
-- a message that's been archived keeps existing but loses the INBOX
-- label, so the label-based walk silently skipped anything archived.
-- Every connection's progress is reset so the next run actually covers
-- the whole mailbox under the new method rather than staying flagged
-- done from the old, narrower one.
UPDATE "GmailConnection"
SET "historySyncPhase" = 'ALL', "historySyncDone" = false, "historySyncCursor" = NULL;

ALTER TABLE "GmailConnection" ALTER COLUMN "historySyncPhase" SET DEFAULT 'ALL';
