-- CreateTable
CREATE TABLE "SmsOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsOtp_phone_expiresAt_idx" ON "SmsOtp"("phone", "expiresAt");

-- CreateIndex
CREATE INDEX "SmsOtp_phone_createdAt_idx" ON "SmsOtp"("phone", "createdAt");
