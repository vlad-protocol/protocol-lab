-- CreateEnum
CREATE TYPE "EventPricing" AS ENUM ('PAID', 'FREE');

-- CreateEnum
CREATE TYPE "TicketingPlatform" AS ENUM ('ZEFFY', 'PARTIFUL');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "MarketingEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "pricing" "EventPricing" NOT NULL,
    "platform" "TicketingPlatform" NOT NULL,
    "zeffyCampaignId" TEXT,
    "ticketsSold" INTEGER,
    "revenue" DOUBLE PRECISION,
    "rsvpCount" INTEGER,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "igMediaId" TEXT NOT NULL,
    "permalink" TEXT,
    "mediaType" TEXT,
    "caption" TEXT,
    "transcript" TEXT,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "transcriptError" TEXT,
    "contentCategory" TEXT,
    "categoryReasoning" TEXT,
    "thumbnailUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "lastMetricsSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramConnection" (
    "id" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "username" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastRefreshAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZeffyConnection" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZeffyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InstagramPostToMarketingEvent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "MarketingEvent_eventDate_idx" ON "MarketingEvent"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_igMediaId_key" ON "InstagramPost"("igMediaId");

-- CreateIndex
CREATE INDEX "InstagramPost_postedAt_idx" ON "InstagramPost"("postedAt");

-- CreateIndex
CREATE INDEX "InstagramPost_transcriptStatus_idx" ON "InstagramPost"("transcriptStatus");

-- CreateIndex
CREATE UNIQUE INDEX "_InstagramPostToMarketingEvent_AB_unique" ON "_InstagramPostToMarketingEvent"("A", "B");

-- CreateIndex
CREATE INDEX "_InstagramPostToMarketingEvent_B_index" ON "_InstagramPostToMarketingEvent"("B");

-- AddForeignKey
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstagramPostToMarketingEvent" ADD CONSTRAINT "_InstagramPostToMarketingEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "InstagramPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstagramPostToMarketingEvent" ADD CONSTRAINT "_InstagramPostToMarketingEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "MarketingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
