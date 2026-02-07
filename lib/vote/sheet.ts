import { SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { isValidPublicToken } from '@/lib/tokens';
import type { VoteSheetDto } from '@/lib/vote/types';

export function getEffectiveSheetStatus(status: SheetStatus, expiresAt: Date, now = new Date()) {
  if (status === SheetStatus.DRAFT && expiresAt <= now) {
    return SheetStatus.EXPIRED;
  }

  return status;
}

export async function getVoteSheetByToken(token: string): Promise<VoteSheetDto | null> {
  if (!isValidPublicToken(token)) {
    return null;
  }

  const sheet = await prisma.sheet.findUnique({
    where: { publicToken: token },
    include: {
      owner: {
        select: {
          fullName: true,
          apartmentNumber: true,
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

  if (!sheet) {
    return null;
  }

  const answerMap = new Map(sheet.answers.map((answer) => [answer.questionId, answer.vote]));
  const effectiveStatus = getEffectiveSheetStatus(sheet.status, sheet.expiresAt);

  return {
    id: sheet.id,
    status: sheet.status,
    effectiveStatus,
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
      fullName: sheet.owner.fullName,
      apartmentNumber: sheet.owner.apartmentNumber,
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
