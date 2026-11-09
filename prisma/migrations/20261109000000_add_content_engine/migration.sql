-- CreateEnum
CREATE TYPE "ContentIdeaStatus" AS ENUM ('INBOX', 'SCRIPTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentScriptStatus" AS ENUM ('DRAFT', 'APPROVED', 'FILMING', 'EDITING', 'READY', 'POSTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentCarouselStatus" AS ENUM ('DRAFT', 'READY', 'POSTED');

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePlatform" TEXT NOT NULL DEFAULT 'instagram',
    "whyItWorks" TEXT,
    "hookPattern" TEXT,
    "status" "ContentIdeaStatus" NOT NULL DEFAULT 'INBOX',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentScript" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "closingPrompt" TEXT,
    "status" "ContentScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "productionFormat" TEXT,
    "viralityScore" INTEGER,
    "viralityNotes" TEXT,
    "ideaId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "caption" TEXT,
    "videoUrl" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "status" "ContentPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "publishError" TEXT,
    "scriptId" TEXT,
    "instagramPostId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCarousel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "newHooks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentCarouselStatus" NOT NULL DEFAULT 'DRAFT',
    "sourcePostId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCarousel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCarouselSlide" (
    "id" TEXT NOT NULL,
    "carouselId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ContentCarouselSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentIdea_status_idx" ON "ContentIdea"("status");

-- CreateIndex
CREATE INDEX "ContentScript_status_idx" ON "ContentScript"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPost_instagramPostId_key" ON "ContentPost"("instagramPostId");

-- CreateIndex
CREATE INDEX "ContentPost_scheduledFor_idx" ON "ContentPost"("scheduledFor");

-- CreateIndex
CREATE INDEX "ContentPost_status_idx" ON "ContentPost"("status");

-- CreateIndex
CREATE INDEX "ContentCarouselSlide_carouselId_idx" ON "ContentCarouselSlide"("carouselId");

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentScript" ADD CONSTRAINT "ContentScript_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentScript" ADD CONSTRAINT "ContentScript_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "ContentScript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_instagramPostId_fkey" FOREIGN KEY ("instagramPostId") REFERENCES "InstagramPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCarousel" ADD CONSTRAINT "ContentCarousel_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "InstagramPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCarousel" ADD CONSTRAINT "ContentCarousel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCarouselSlide" ADD CONSTRAINT "ContentCarouselSlide_carouselId_fkey" FOREIGN KEY ("carouselId") REFERENCES "ContentCarousel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

