-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SIGNER', 'READONLY', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProtocolType" AS ENUM ('ESTABLISHMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('NONE', 'NOT_REQUIRED', 'PENDING', 'SIGNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SheetStatus" AS ENUM ('DRAFT', 'PENDING_ORGANIZER', 'SIGNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Vote" AS ENUM ('FOR', 'AGAINST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dubidocApiKey" TEXT,
    "dubidocOrgId" TEXT,
    "turboSmsApiKey" TEXT,
    "openAiApiKey" TEXT,
    "organizerName" TEXT,
    "organizerPosition" TEXT,
    "organizerEmail" TEXT,
    "organizerPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OSBB" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "edrpou" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OSBB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Protocol" (
    "id" TEXT NOT NULL,
    "osbbId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ProtocolType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "requiresTwoThirds" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "apartmentNumber" TEXT NOT NULL,
    "totalArea" DECIMAL(10,2) NOT NULL,
    "ownershipNumerator" INTEGER NOT NULL,
    "ownershipDenominator" INTEGER NOT NULL,
    "ownedArea" DECIMAL(10,2) NOT NULL,
    "ownershipDocument" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "representativeName" TEXT,
    "representativeDocument" TEXT,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'NONE',
    "consentSignedAt" TIMESTAMP(3),
    "consentDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sheet" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "surveyDate" TIMESTAMP(3) NOT NULL,
    "status" "SheetStatus" NOT NULL DEFAULT 'DRAFT',
    "publicToken" TEXT NOT NULL,
    "dubidocDocumentId" TEXT,
    "pdfFileUrl" TEXT,
    "ownerSignedAt" TIMESTAMP(3),
    "organizerSignedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "vote" "Vote",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeferredQueue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "runAt" TIMESTAMP(3) NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeferredQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "OSBB_userId_idx" ON "OSBB"("userId");

-- CreateIndex
CREATE INDEX "Protocol_osbbId_idx" ON "Protocol"("osbbId");

-- CreateIndex
CREATE INDEX "Question_protocolId_idx" ON "Question"("protocolId");

-- CreateIndex
CREATE INDEX "Owner_protocolId_idx" ON "Owner"("protocolId");

-- CreateIndex
CREATE UNIQUE INDEX "Sheet_publicToken_key" ON "Sheet"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Sheet_dubidocDocumentId_key" ON "Sheet"("dubidocDocumentId");

-- CreateIndex
CREATE INDEX "Sheet_protocolId_idx" ON "Sheet"("protocolId");

-- CreateIndex
CREATE INDEX "Sheet_ownerId_idx" ON "Sheet"("ownerId");

-- CreateIndex
CREATE INDEX "Sheet_publicToken_idx" ON "Sheet"("publicToken");

-- CreateIndex
CREATE INDEX "Sheet_dubidocDocumentId_idx" ON "Sheet"("dubidocDocumentId");

-- CreateIndex
CREATE INDEX "Answer_sheetId_idx" ON "Answer"("sheetId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sheetId_questionId_key" ON "Answer"("sheetId", "questionId");

-- CreateIndex
CREATE INDEX "DeferredQueue_status_runAt_idx" ON "DeferredQueue"("status", "runAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OSBB" ADD CONSTRAINT "OSBB_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocol" ADD CONSTRAINT "Protocol_osbbId_fkey" FOREIGN KEY ("osbbId") REFERENCES "OSBB"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
