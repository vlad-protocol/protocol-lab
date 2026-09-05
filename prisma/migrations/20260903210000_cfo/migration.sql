-- CreateEnum
CREATE TYPE "CFOTxnType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "CFOTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "CFOTxnType" NOT NULL,
    "category" TEXT NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CFOTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CFOBudgetCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CFOBudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CFOMerchantRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" "CFOTxnType" NOT NULL DEFAULT 'EXPENSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CFOMerchantRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CFORecurringBill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CFORecurringBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CFOGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "savedSoFar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CFOGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CFODebt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CFODebt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CFOTransaction_userId_date_idx" ON "CFOTransaction"("userId", "date");

-- CreateIndex
CREATE INDEX "CFOTransaction_userId_category_idx" ON "CFOTransaction"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CFOBudgetCategory_userId_key_key" ON "CFOBudgetCategory"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CFOMerchantRule_userId_matchText_key" ON "CFOMerchantRule"("userId", "matchText");

-- CreateIndex
CREATE INDEX "CFORecurringBill_userId_dayOfMonth_idx" ON "CFORecurringBill"("userId", "dayOfMonth");

-- AddForeignKey
ALTER TABLE "CFOTransaction" ADD CONSTRAINT "CFOTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CFOBudgetCategory" ADD CONSTRAINT "CFOBudgetCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CFOMerchantRule" ADD CONSTRAINT "CFOMerchantRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CFORecurringBill" ADD CONSTRAINT "CFORecurringBill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CFOGoal" ADD CONSTRAINT "CFOGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CFODebt" ADD CONSTRAINT "CFODebt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
