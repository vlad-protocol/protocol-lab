-- CreateEnum
CREATE TYPE "ActivationPackageTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "packageTier" "ActivationPackageTier" NOT NULL DEFAULT 'BRONZE',
    "clientMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "rule1Goal" TEXT,
    "rule2Connection" TEXT,
    "rule3Currency" TEXT,
    "rule4Story" TEXT,
    "gate1PassedAt" TIMESTAMP(3),
    "rule5StartEarly" TEXT,
    "rule6GrandEntrance" TEXT,
    "rule7Journey" TEXT,
    "rule8PeakMoment" TEXT,
    "rule9Trigger" TEXT,
    "rule10CloseLoop" TEXT,
    "gate2PassedAt" TIMESTAMP(3),
    "costLineItems" JSONB NOT NULL DEFAULT '[]',
    "costBaseA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPassThroughB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quotePreTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quoteTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quoteTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mainSponsorCategory" TEXT,
    "proposalDraft" TEXT,
    "contractDraft" TEXT,
    "reportDraft" TEXT,
    "attendanceTarget" INTEGER,
    "attendanceActual" INTEGER,
    "dayOfConversions" INTEGER,
    "revenueReported" DOUBLE PRECISION,
    "totalImpressions" INTEGER,
    "referralCount" INTEGER,
    "npsScore" INTEGER,
    "reportNextStep" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationStep" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "doneWhen" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "ActivationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorSlot" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brandName" TEXT,
    "tier" TEXT,
    "fee" DOUBLE PRECISION,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationPayment" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "cfoTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activation_contactId_key" ON "Activation"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationStep_activationId_stepNumber_key" ON "ActivationStep"("activationId", "stepNumber");

-- CreateIndex
CREATE INDEX "ActivationStep_activationId_idx" ON "ActivationStep"("activationId");

-- CreateIndex
CREATE INDEX "SponsorSlot_activationId_idx" ON "SponsorSlot"("activationId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationPayment_cfoTransactionId_key" ON "ActivationPayment"("cfoTransactionId");

-- CreateIndex
CREATE INDEX "ActivationPayment_activationId_idx" ON "ActivationPayment"("activationId");

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationStep" ADD CONSTRAINT "ActivationStep_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorSlot" ADD CONSTRAINT "SponsorSlot_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationPayment" ADD CONSTRAINT "ActivationPayment_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationPayment" ADD CONSTRAINT "ActivationPayment_cfoTransactionId_fkey" FOREIGN KEY ("cfoTransactionId") REFERENCES "CFOTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
