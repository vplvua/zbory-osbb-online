import { promises as fs } from 'node:fs';
import { prisma } from '@/lib/db/prisma';
import { formatOwnerFullName, formatOwnerShortName } from '@/lib/owner/name';
import { generateVoteSheetPdf, writeVoteSheetPdfToTemp } from '@/lib/pdf/vote-sheet';

export const PDF_TARGET_MS = 3000;

export type GenerateSheetPdfResult =
  | {
      ok: true;
      generationMs: number;
      filePath: string;
    }
  | {
      ok: false;
      message: string;
    };

type GenerateSheetPdfBytesResult =
  | {
      ok: true;
      generationMs: number;
      pdfBytes: Uint8Array;
    }
  | {
      ok: false;
      message: string;
    };

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message.slice(0, 1000);
    }

    return error.name.slice(0, 1000);
  }

  if (typeof error === 'string') {
    return error.slice(0, 1000);
  }

  return 'Невідома помилка генерації PDF.';
}

async function loadSheetPdfContext(sheetId: string) {
  return prisma.sheet.findUnique({
    where: { id: sheetId },
    select: {
      id: true,
      surveyDate: true,
      owner: {
        select: {
          lastName: true,
          firstName: true,
          middleName: true,
          apartmentNumber: true,
          totalArea: true,
          ownershipDocument: true,
          ownershipNumerator: true,
          ownershipDenominator: true,
          ownedArea: true,
          representativeName: true,
          representativeDocument: true,
        },
      },
      protocol: {
        select: {
          number: true,
          date: true,
          type: true,
          osbb: {
            select: {
              name: true,
              address: true,
              organizerName: true,
            },
          },
          questions: {
            select: {
              id: true,
              orderNumber: true,
              text: true,
              proposal: true,
            },
            orderBy: {
              orderNumber: 'asc',
            },
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

function buildVoteSheetPdfInput(
  sheet: NonNullable<Awaited<ReturnType<typeof loadSheetPdfContext>>>,
) {
  const answerMap = new Map(sheet.answers.map((answer) => [answer.questionId, answer.vote]));

  return {
    sheetId: sheet.id,
    generatedAt: new Date(),
    surveyDate: sheet.surveyDate,
    protocol: {
      number: sheet.protocol.number,
      date: sheet.protocol.date,
      type: sheet.protocol.type,
    },
    osbb: {
      name: sheet.protocol.osbb.name,
      address: sheet.protocol.osbb.address,
    },
    owner: {
      fullName: formatOwnerFullName(sheet.owner),
      shortName: formatOwnerShortName(sheet.owner),
      apartmentNumber: sheet.owner.apartmentNumber,
      totalArea: sheet.owner.totalArea.toString(),
      ownershipDocument: sheet.owner.ownershipDocument,
      ownershipNumerator: sheet.owner.ownershipNumerator,
      ownershipDenominator: sheet.owner.ownershipDenominator,
      ownedArea: sheet.owner.ownedArea.toString(),
      representativeName: sheet.owner.representativeName,
      representativeDocument: sheet.owner.representativeDocument,
    },
    organizerName: sheet.protocol.osbb.organizerName ?? '',
    questions: sheet.protocol.questions.map((question) => ({
      orderNumber: question.orderNumber,
      text: question.text,
      proposal: question.proposal,
      vote: answerMap.get(question.id) ?? null,
    })),
  };
}

async function generateSheetPdfBytes(sheetId: string): Promise<GenerateSheetPdfBytesResult> {
  const sheet = await loadSheetPdfContext(sheetId);
  if (!sheet) {
    return { ok: false, message: 'Листок не знайдено.' };
  }

  try {
    const pdfResult = await generateVoteSheetPdf(buildVoteSheetPdfInput(sheet));
    return { ok: true, generationMs: pdfResult.generationMs, pdfBytes: pdfResult.pdfBytes };
  } catch (error) {
    return { ok: false, message: toErrorMessage(error) };
  }
}

function isMissingPdfFileError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT',
  );
}

export async function loadSheetPdfBytesWithFallback(input: {
  sheetId: string;
  pdfFileUrl: string | null;
}): Promise<Uint8Array> {
  let missingTempFile = false;

  if (input.pdfFileUrl) {
    try {
      return await fs.readFile(input.pdfFileUrl);
    } catch (error) {
      if (!isMissingPdfFileError(error)) {
        throw error;
      }

      missingTempFile = true;
    }
  }

  if (missingTempFile) {
    console.warn('[pdf] missing temp artifact, regenerating from DB context', {
      sheetId: input.sheetId,
      pdfFileUrl: input.pdfFileUrl,
    });
  }

  const regenerated = await generateSheetPdfBytes(input.sheetId);
  if (!regenerated.ok) {
    if (regenerated.message === 'Листок не знайдено.') {
      throw new Error('PDF_NOT_AVAILABLE');
    }

    throw new Error(`PDF_REGENERATE_FAILED: ${regenerated.message}`);
  }

  return regenerated.pdfBytes;
}

export async function generateAndStoreSheetPdf(sheetId: string): Promise<GenerateSheetPdfResult> {
  await prisma.sheet.updateMany({
    where: { id: sheetId },
    data: {
      pdfUploadPending: true,
      errorPending: false,
      pdfLastError: null,
    },
  });

  const generated = await generateSheetPdfBytes(sheetId);
  if (!generated.ok) {
    await prisma.sheet.updateMany({
      where: { id: sheetId },
      data: {
        pdfUploadPending: false,
        errorPending: true,
        pdfLastError: generated.message,
      },
    });

    return { ok: false, message: generated.message };
  }

  try {
    const pdfFilePath = await writeVoteSheetPdfToTemp({
      sheetId,
      pdfBytes: generated.pdfBytes,
    });

    await prisma.sheet.update({
      where: { id: sheetId },
      data: {
        pdfFileUrl: pdfFilePath,
        pdfUploadPending: false,
        errorPending: false,
        pdfLastError: null,
      },
    });

    return {
      ok: true,
      generationMs: generated.generationMs,
      filePath: pdfFilePath,
    };
  } catch (error) {
    const message = toErrorMessage(error);
    await prisma.sheet.updateMany({
      where: { id: sheetId },
      data: {
        pdfUploadPending: false,
        errorPending: true,
        pdfLastError: message,
      },
    });

    return { ok: false, message };
  }
}
