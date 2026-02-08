ALTER TABLE "UserSettings" ADD COLUMN "selectedOsbbId" TEXT;

CREATE INDEX "UserSettings_selectedOsbbId_idx" ON "UserSettings"("selectedOsbbId");

ALTER TABLE "UserSettings"
ADD CONSTRAINT "UserSettings_selectedOsbbId_fkey"
FOREIGN KEY ("selectedOsbbId") REFERENCES "OSBB"("id") ON DELETE SET NULL ON UPDATE CASCADE;
