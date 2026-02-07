ALTER TABLE "Owner" ADD COLUMN "osbbId" TEXT;

UPDATE "Owner" AS o
SET "osbbId" = p."osbbId"
FROM "Protocol" AS p
WHERE o."protocolId" = p."id";

ALTER TABLE "Owner" ALTER COLUMN "osbbId" SET NOT NULL;

CREATE TABLE "ProtocolOwner" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolOwner_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProtocolOwner" ("id", "protocolId", "ownerId", "createdAt", "updatedAt")
SELECT md5(o."id" || ':' || o."protocolId"), o."protocolId", o."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Owner" AS o;

CREATE UNIQUE INDEX "ProtocolOwner_protocolId_ownerId_key" ON "ProtocolOwner"("protocolId", "ownerId");
CREATE INDEX "ProtocolOwner_protocolId_idx" ON "ProtocolOwner"("protocolId");
CREATE INDEX "ProtocolOwner_ownerId_idx" ON "ProtocolOwner"("ownerId");
CREATE INDEX "Owner_osbbId_idx" ON "Owner"("osbbId");

ALTER TABLE "ProtocolOwner" ADD CONSTRAINT "ProtocolOwner_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProtocolOwner" ADD CONSTRAINT "ProtocolOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_osbbId_fkey" FOREIGN KEY ("osbbId") REFERENCES "OSBB"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Owner_protocolId_idx";
ALTER TABLE "Owner" DROP CONSTRAINT "Owner_protocolId_fkey";
ALTER TABLE "Owner" DROP COLUMN "protocolId";

CREATE UNIQUE INDEX "Sheet_protocolId_ownerId_key" ON "Sheet"("protocolId", "ownerId");
