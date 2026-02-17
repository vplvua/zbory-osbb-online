import { SheetStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api/error-response';
import { prisma } from '@/lib/db/prisma';
import { isValidPublicToken } from '@/lib/tokens';
import {
  clearSheetDubidocSignState,
  markSheetDubidocSignFailed,
  markSheetDubidocSignPending,
} from '@/lib/vote/dubidoc-sign-state';
import { getVoteSheetByToken } from '@/lib/vote/sheet';
import { refreshSheetSigningStatusFromDubidoc } from '@/lib/vote/signing';

async function markDraftAsExpired(sheetId: string) {
  await prisma.sheet.updateMany({
    where: {
      id: sheetId,
      status: SheetStatus.DRAFT,
    },
    data: {
      status: SheetStatus.EXPIRED,
    },
  });
}

function toIsoOrNull(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!isValidPublicToken(token)) {
    return apiErrorResponse({
      status: 404,
      code: 'VOTE_SHEET_NOT_FOUND',
      message: 'Листок не знайдено.',
    });
  }

  const sheet = await prisma.sheet.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      dubidocDocumentId: true,
      ownerSignedAt: true,
      organizerSignedAt: true,
    },
  });

  if (!sheet) {
    return apiErrorResponse({
      status: 404,
      code: 'VOTE_SHEET_NOT_FOUND',
      message: 'Листок не знайдено.',
    });
  }

  const now = new Date();
  if (sheet.expiresAt <= now || sheet.status === SheetStatus.EXPIRED) {
    await markDraftAsExpired(sheet.id);
    return apiErrorResponse({
      status: 409,
      code: 'VOTE_EXPIRED',
      message: 'Термін голосування завершено.',
    });
  }

  if (sheet.status === SheetStatus.SIGNED) {
    const currentSheet = await getVoteSheetByToken(token, { skipDubidocAutoSync: true });
    return NextResponse.json({
      ok: true,
      changed: false,
      message: 'Документ вже підписано обома сторонами.',
      sheet: currentSheet,
    });
  }

  if (sheet.status !== SheetStatus.DRAFT && sheet.status !== SheetStatus.PENDING_ORGANIZER) {
    return apiErrorResponse({
      status: 409,
      code: 'VOTE_STATUS_REFRESH_UNAVAILABLE',
      message: 'Оновлення статусу зараз недоступне для цього листка.',
    });
  }

  if (!sheet.dubidocDocumentId) {
    return apiErrorResponse({
      status: 409,
      code: 'VOTE_SIGNING_NOT_STARTED',
      message: 'Підписання ще не запущено. Спочатку надішліть голос.',
    });
  }

  const beforeStatus = sheet.status;
  const beforeOwnerSignedAt = toIsoOrNull(sheet.ownerSignedAt);
  const beforeOrganizerSignedAt = toIsoOrNull(sheet.organizerSignedAt);

  await markSheetDubidocSignPending(sheet.id);

  try {
    await refreshSheetSigningStatusFromDubidoc(sheet.id);
    await clearSheetDubidocSignState(sheet.id);

    const updatedSheet = await getVoteSheetByToken(token, { skipDubidocAutoSync: true });
    if (!updatedSheet) {
      return apiErrorResponse({
        status: 500,
        code: 'VOTE_REFRESH_FAILED',
        message: 'Не вдалося оновити дані листка після синхронізації.',
      });
    }

    const changed =
      beforeStatus !== updatedSheet.status ||
      beforeOwnerSignedAt !== updatedSheet.ownerSignedAt ||
      beforeOrganizerSignedAt !== updatedSheet.organizerSignedAt;

    const message = changed
      ? updatedSheet.status === SheetStatus.SIGNED
        ? 'Статус оновлено: документ підписано обома сторонами.'
        : updatedSheet.ownerSignedAt
          ? 'Статус оновлено: голос співвласника прийнято.'
          : 'Статус документа оновлено.'
      : 'Змін статусу документа не виявлено.';

    return NextResponse.json({
      ok: true,
      changed,
      message,
      sheet: updatedSheet,
    });
  } catch (error) {
    console.error('[vote:status-refresh] failed to sync Dubidoc status', {
      sheetId: sheet.id,
      token,
      error,
    });

    const message = 'Не вдалося оновити статус документа. Спробуйте ще раз.';
    await markSheetDubidocSignFailed(sheet.id, message);
    return apiErrorResponse({
      status: 502,
      code: 'VOTE_SIGNING_UNAVAILABLE',
      message,
    });
  }
}
