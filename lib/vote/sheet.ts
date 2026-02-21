import { SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { formatOwnerShortName } from '@/lib/owner/name';
import { isValidPublicToken } from '@/lib/tokens';
import { refreshSheetSigningStatusFromDubidoc } from '@/lib/vote/signing';
import type { VoteSheetDto } from '@/lib/vote/types';

const DUBIDOC_AUTO_SYNC_INTERVAL_MS = 30_000;

type VoteSheetLookupOptions = {
  skipDubidocAutoSync?: boolean;
};

export function getEffectiveSheetStatus(status: SheetStatus, expiresAt: Date, now = new Date()) {
  if (status === SheetStatus.DRAFT && expiresAt <= now) {
    return SheetStatus.EXPIRED;
  }

  return status;
}

async function readVoteSheetByToken(token: string) {
  return prisma.sheet.findUnique({
    where: { publicToken: token },
    include: {
      owner: {
        select: {
          lastName: true,
          firstName: true,
          middleName: true,
          apartmentNumber: true,
          totalArea: true,
          ownedArea: true,
          ownershipNumerator: true,
          ownershipDenominator: true,
        },
      },
      protocol: {
        select: {
          number: true,
          date: true,
          osbb: {
            select: {
              name: true,
            },
          },
          questions: {
            select: {
              id: true,
              orderNumber: true,
              text: true,
              proposal: true,
              requiresTwoThirds: true,
            },
            orderBy: { orderNumber: 'asc' },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          vote: true,
        },
      },
    },
  });
}

function shouldAutoSyncWithDubidoc(sheet: {
  status: SheetStatus;
  dubidocDocumentId: string | null;
  dubidocSignPending: boolean;
  dubidocLastCheckedAt: Date | null;
}): boolean {
  if (!sheet.dubidocDocumentId || sheet.dubidocSignPending) {
    return false;
  }

  if (sheet.status !== SheetStatus.DRAFT && sheet.status !== SheetStatus.PENDING_ORGANIZER) {
    return false;
  }

  const lastCheckedAt = sheet.dubidocLastCheckedAt;
  if (!lastCheckedAt) {
    return true;
  }

  return Date.now() - lastCheckedAt.getTime() >= DUBIDOC_AUTO_SYNC_INTERVAL_MS;
}

export async function getVoteSheetByToken(
  token: string,
  options?: VoteSheetLookupOptions,
): Promise<VoteSheetDto | null> {
  if (!isValidPublicToken(token)) {
    return null;
  }

  let sheet = await readVoteSheetByToken(token);

  if (
    sheet &&
    !options?.skipDubidocAutoSync &&
    shouldAutoSyncWithDubidoc({
      status: sheet.status,
      dubidocDocumentId: sheet.dubidocDocumentId,
      dubidocSignPending: sheet.dubidocSignPending,
      dubidocLastCheckedAt: sheet.dubidocLastCheckedAt,
    })
  ) {
    const sheetIdForSync = sheet.id;
    try {
      await refreshSheetSigningStatusFromDubidoc(sheetIdForSync);
      sheet = await readVoteSheetByToken(token);
    } catch (error) {
      console.warn('[vote:sheet] failed to auto-sync Dubidoc status', {
        sheetId: sheetIdForSync,
        token,
        error,
      });
    }
  }

  if (!sheet) {
    return null;
  }

  const answerMap = new Map(sheet.answers.map((answer) => [answer.questionId, answer.vote]));
  const effectiveStatus = getEffectiveSheetStatus(sheet.status, sheet.expiresAt);

  return {
    id: sheet.id,
    status: sheet.status,
    effectiveStatus,
    ownerSignedAt: sheet.ownerSignedAt?.toISOString() ?? null,
    organizerSignedAt: sheet.organizerSignedAt?.toISOString() ?? null,
    dubidocSignPending: sheet.dubidocSignPending,
    dubidocLastError: sheet.dubidocLastError,
    hasDubidocDocument: Boolean(sheet.dubidocDocumentId),
    pdfUploadPending: sheet.pdfUploadPending,
    errorPending: sheet.errorPending,
    hasPdfFile: Boolean(sheet.pdfFileUrl),
    surveyDate: sheet.surveyDate.toISOString(),
    createdAt: sheet.createdAt.toISOString(),
    expiresAt: sheet.expiresAt.toISOString(),
    protocolDate: sheet.protocol.date.toISOString(),
    protocolNumber: sheet.protocol.number,
    osbbName: sheet.protocol.osbb.name,
    owner: {
      shortName: formatOwnerShortName(sheet.owner),
      apartmentNumber: sheet.owner.apartmentNumber,
      totalArea: sheet.owner.totalArea.toString(),
      ownedArea: sheet.owner.ownedArea.toString(),
      ownershipNumerator: sheet.owner.ownershipNumerator,
      ownershipDenominator: sheet.owner.ownershipDenominator,
    },
    questions: sheet.protocol.questions.map((question) => ({
      id: question.id,
      orderNumber: question.orderNumber,
      text: question.text,
      proposal: question.proposal,
      requiresTwoThirds: question.requiresTwoThirds,
      vote: answerMap.get(question.id) ?? null,
    })),
  };
}
