-- CreateTable
CREATE TABLE "TrainingCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCheckIn_userId_dayKey_weekOf_key" ON "TrainingCheckIn"("userId", "dayKey", "weekOf");

-- AddForeignKey
ALTER TABLE "TrainingCheckIn" ADD CONSTRAINT "TrainingCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
