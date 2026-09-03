-- CreateEnum
CREATE TYPE "ShootStage" AS ENUM ('SCRIPTING', 'FILM', 'EDITING', 'READY', 'POSTED');

-- CreateEnum
CREATE TYPE "StudioEntryKind" AS ENUM ('AD', 'SCRIPT', 'TREND');

-- CreateEnum
CREATE TYPE "BrainType" AS ENUM ('LEARNING', 'THOUGHT', 'NOTE');

-- CreateEnum
CREATE TYPE "BrainCategory" AS ENUM ('PERSONAL', 'BUSINESS', 'MARKETING', 'EVENTS', 'FITNESS', 'PHILOSOPHY', 'CREATIVITY', 'RELATIONSHIPS', 'OTHER');

-- CreateTable
CREATE TABLE "ShootCard" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "clientLabel" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "stage" "ShootStage" NOT NULL DEFAULT 'SCRIPTING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioEntry" (
    "id" TEXT NOT NULL,
    "kind" "StudioEntryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT,
    "platform" TEXT,
    "sourceUrl" TEXT,
    "content" TEXT,
    "breakdown" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainEntry" (
    "id" TEXT NOT NULL,
    "type" "BrainType" NOT NULL,
    "category" "BrainCategory" NOT NULL DEFAULT 'OTHER',
    "source" TEXT,
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShootCard_stage_order_idx" ON "ShootCard"("stage", "order");

-- CreateIndex
CREATE INDEX "ShootCard_contactId_idx" ON "ShootCard"("contactId");

-- CreateIndex
CREATE INDEX "StudioEntry_kind_createdAt_idx" ON "StudioEntry"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "BrainEntry_type_category_createdAt_idx" ON "BrainEntry"("type", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "ShootCard" ADD CONSTRAINT "ShootCard_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootCard" ADD CONSTRAINT "ShootCard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioEntry" ADD CONSTRAINT "StudioEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioEntry" ADD CONSTRAINT "StudioEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainEntry" ADD CONSTRAINT "BrainEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
