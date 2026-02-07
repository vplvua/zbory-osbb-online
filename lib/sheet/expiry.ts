import { ProtocolType } from '@prisma/client';

const SHEET_VALIDITY_DAYS: Record<ProtocolType, number> = {
  ESTABLISHMENT: 15,
  GENERAL: 45,
};

export function getSheetValidityDays(protocolType: ProtocolType): number {
  return SHEET_VALIDITY_DAYS[protocolType];
}

export function calculateSheetExpiresAt(protocolDate: Date, protocolType: ProtocolType): Date {
  const expiresAt = new Date(protocolDate);
  expiresAt.setUTCHours(23, 59, 59, 999);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + getSheetValidityDays(protocolType));
  return expiresAt;
}
