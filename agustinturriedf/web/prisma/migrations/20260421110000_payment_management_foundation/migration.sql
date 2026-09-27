-- CreateTable
CREATE TABLE "TrainerConfig" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "defaultMonthlyAmountInCents" INTEGER NOT NULL DEFAULT 3000000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentPayment" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentHistory" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "currentPaymentId" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainerConfig_trainerId_key" ON "TrainerConfig"("trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentPayment_studentProfileId_key" ON "CurrentPayment"("studentProfileId");

-- CreateIndex
CREATE INDEX "CurrentPayment_studentProfileId_idx" ON "CurrentPayment"("studentProfileId");

-- CreateIndex
CREATE INDEX "CurrentPayment_dueDate_idx" ON "CurrentPayment"("dueDate");

-- CreateIndex
CREATE INDEX "CurrentPayment_startDate_idx" ON "CurrentPayment"("startDate");

-- CreateIndex
CREATE INDEX "PaymentHistory_studentProfileId_idx" ON "PaymentHistory"("studentProfileId");

-- CreateIndex
CREATE INDEX "PaymentHistory_paymentDate_idx" ON "PaymentHistory"("paymentDate");

-- CreateIndex
CREATE INDEX "PaymentHistory_recordedByUserId_idx" ON "PaymentHistory"("recordedByUserId");

-- AddForeignKey
ALTER TABLE "TrainerConfig" ADD CONSTRAINT "TrainerConfig_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentPayment" ADD CONSTRAINT "CurrentPayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_currentPaymentId_fkey" FOREIGN KEY ("currentPaymentId") REFERENCES "CurrentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
