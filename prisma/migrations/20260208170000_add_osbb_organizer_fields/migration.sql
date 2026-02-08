ALTER TABLE "OSBB"
ADD COLUMN "organizerName" TEXT,
ADD COLUMN "organizerEmail" TEXT,
ADD COLUMN "organizerPhone" TEXT;

UPDATE "OSBB" AS o
SET
  "organizerName" = COALESCE(o."organizerName", s."organizerName"),
  "organizerEmail" = COALESCE(o."organizerEmail", s."organizerEmail"),
  "organizerPhone" = COALESCE(o."organizerPhone", s."organizerPhone")
FROM "UserSettings" AS s
WHERE s."userId" = o."userId";
