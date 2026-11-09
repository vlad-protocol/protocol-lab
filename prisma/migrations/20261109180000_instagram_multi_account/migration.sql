-- Multi-account Instagram support: each connected account can now be
-- distinguished (label) and content can be attributed/targeted to a
-- specific one.

-- AlterTable: InstagramConnection gets a nickname + a real uniqueness
-- constraint on igUserId (so connecting/reconnecting the same account
-- upserts instead of creating a duplicate row).
ALTER TABLE "InstagramConnection" ADD COLUMN "label" TEXT;
CREATE UNIQUE INDEX "InstagramConnection_igUserId_key" ON "InstagramConnection"("igUserId");

-- AlterTable: InstagramPost — which connected account each synced post
-- came from. Nullable so existing rows synced before this migration
-- aren't broken; left null for those.
ALTER TABLE "InstagramPost" ADD COLUMN "instagramConnectionId" TEXT;
CREATE INDEX "InstagramPost_instagramConnectionId_idx" ON "InstagramPost"("instagramConnectionId");
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "InstagramConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ContentPost — which account a scheduled post should
-- publish to.
ALTER TABLE "ContentPost" ADD COLUMN "instagramConnectionId" TEXT;
CREATE INDEX "ContentPost_instagramConnectionId_idx" ON "ContentPost"("instagramConnectionId");
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "InstagramConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
