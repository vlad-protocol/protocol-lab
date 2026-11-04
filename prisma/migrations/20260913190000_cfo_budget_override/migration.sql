-- CreateTable
CREATE TABLE "CFOBudgetOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "monthlyBudget" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CFOBudgetOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CFOBudgetOverride_userId_yearMonth_idx" ON "CFOBudgetOverride"("userId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "CFOBudgetOverride_userId_categoryKey_yearMonth_key" ON "CFOBudgetOverride"("userId", "categoryKey", "yearMonth");

-- AddForeignKey
ALTER TABLE "CFOBudgetOverride" ADD CONSTRAINT "CFOBudgetOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
