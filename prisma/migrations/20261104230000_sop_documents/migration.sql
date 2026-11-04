-- CreateEnum
CREATE TYPE "SopDocType" AS ENUM ('PROPOSAL', 'CONTRACT', 'ATTENDEE', 'RUNOFSHOW', 'ROSTER', 'SURVEY', 'REPORT');

-- CreateTable
CREATE TABLE "SopDocument" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "type" "SopDocType" NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "rows" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SopDocument_activationId_idx" ON "SopDocument"("activationId");

-- AddForeignKey
ALTER TABLE "SopDocument" ADD CONSTRAINT "SopDocument_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopDocument" ADD CONSTRAINT "SopDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
