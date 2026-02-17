import { prisma } from '@/lib/db/prisma';

const MAX_ERROR_LENGTH = 1000;

function normalizeErrorMessage(message: string): string {
  const normalized = message.trim();
  if (!normalized) {
    return 'Невідома помилка підготовки підписання.';
  }

  return normalized.slice(0, MAX_ERROR_LENGTH);
}

export async function markSheetDubidocSignPending(sheetId: string): Promise<void> {
  await prisma.sheet.updateMany({
    where: { id: sheetId },
    data: {
      dubidocSignPending: true,
      dubidocLastError: null,
    },
  });
}

export async function clearSheetDubidocSignState(sheetId: string): Promise<void> {
  await prisma.sheet.updateMany({
    where: { id: sheetId },
    data: {
      dubidocSignPending: false,
      dubidocLastError: null,
    },
  });
}

export async function markSheetDubidocSignFailed(
  sheetId: string,
  userMessage: string,
): Promise<void> {
  await prisma.sheet.updateMany({
    where: { id: sheetId },
    data: {
      dubidocSignPending: false,
      dubidocLastError: normalizeErrorMessage(userMessage),
    },
  });
}
