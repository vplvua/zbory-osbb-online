ALTER TABLE "Owner"
ADD COLUMN "lastName" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "middleName" TEXT;

WITH normalized AS (
  SELECT
    "id",
    regexp_replace(trim("fullName"), '\s+', ' ', 'g') AS "normalizedFullName"
  FROM "Owner"
)
UPDATE "Owner" AS o
SET
  "lastName" = COALESCE(NULLIF(split_part(n."normalizedFullName", ' ', 1), ''), ''),
  "firstName" = COALESCE(NULLIF(split_part(n."normalizedFullName", ' ', 2), ''), ''),
  "middleName" = COALESCE(
    NULLIF(substring(n."normalizedFullName" from '^(?:\S+\s+){2}(.*)$'), ''),
    ''
  )
FROM normalized AS n
WHERE o."id" = n."id";

ALTER TABLE "Owner"
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "middleName" SET NOT NULL;

CREATE INDEX "Owner_lastName_idx" ON "Owner"("lastName");

ALTER TABLE "Owner" DROP COLUMN "fullName";
