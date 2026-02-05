-- CreateEnum
CREATE TYPE "SmsRateLimitAction" AS ENUM ('REQUEST_CODE', 'VERIFY_CODE');

-- CreateTable
CREATE TABLE "SmsRateLimit" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ip" TEXT,
    "action" "SmsRateLimitAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsRateLimit_phone_action_createdAt_idx" ON "SmsRateLimit"("phone", "action", "createdAt");
