import { SheetStatus, type Vote } from '@prisma/client';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api/error-response';
import { prisma } from '@/lib/db/prisma';
import { generateAndStoreSheetPdf, PDF_TARGET_MS } from '@/lib/sheet/pdf-processing';
import { isValidPublicToken } from '@/lib/tokens';
import {
  ensureSheetSigningRedirectUrl,
  ORGANIZER_EMAIL_REQUIRED_ERROR,
  OWNER_EMAIL_REQUIRED_ERROR,
  SIGNERS_EMAIL_CONFLICT_ERROR,
} from '@/lib/vote/signing';
import {
  clearSheetDubidocSignState,
  markSheetDubidocSignFailed,
  markSheetDubidocSignPending,
} from '@/lib/vote/dubidoc-sign-state';

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

function hasCompleteAnswers(
  answers: Array<{ questionId: string; vote: Vote | null }>,
  questionIds: string[],
): boolean {
  if (answers.length !== questionIds.length) {
    return false;
  }

  const answered = new Set(
    answers
      .filter((answer) => answer.vote === 'FOR' || answer.vote === 'AGAINST')
      .map((a) => a.questionId),
  );

  if (answered.size !== questionIds.length) {
    return false;
  }

  return questionIds.every((questionId) => answered.has(questionId));
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
      pdfFileUrl: true,
      answers: {
        select: {
          questionId: true,
          vote: true,
        },
      },
      protocol: {
        select: {
          questions: {
            select: {
              id: true,
            },
          },
        },
      },
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

  if (sheet.status !== SheetStatus.DRAFT) {
    return apiErrorResponse({
      status: 409,
      code: 'VOTE_ALREADY_SUBMITTED',
      message: 'Листок вже подано та очікує наступного етапу.',
    });
  }

  const questionIds = sheet.protocol.questions.map((question) => question.id);
  if (!hasCompleteAnswers(sheet.answers, questionIds)) {
    return apiErrorResponse({
      status: 409,
      code: 'VOTE_INCOMPLETE_ANSWERS',
      message: 'Спочатку заповніть усі відповіді та надішліть голос.',
    });
  }

  await markSheetDubidocSignPending(sheet.id);

  if (!sheet.pdfFileUrl) {
    const pdfResult = await generateAndStoreSheetPdf(sheet.id);
    if (!pdfResult.ok) {
      console.error('[pdf] failed to generate sheet pdf for signing link', {
        sheetId: sheet.id,
        message: pdfResult.message,
      });
      const message = 'Не вдалося підготувати документ для підписання. Спробуйте ще раз.';
      await markSheetDubidocSignFailed(sheet.id, message);
      return apiErrorResponse({
        status: 500,
        code: 'VOTE_SIGN_PREPARE_FAILED',
        message,
      });
    }

    if (pdfResult.generationMs > PDF_TARGET_MS) {
      console.warn(
        `[pdf] Sheet ${sheet.id} generated in ${pdfResult.generationMs}ms (target ${PDF_TARGET_MS}ms)`,
      );
    }
  }

  let redirectUrl: string | null = null;
  try {
    redirectUrl = await ensureSheetSigningRedirectUrl(sheet.id);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === OWNER_EMAIL_REQUIRED_ERROR ||
        error.name === ORGANIZER_EMAIL_REQUIRED_ERROR ||
        error.name === SIGNERS_EMAIL_CONFLICT_ERROR)
    ) {
      const message =
        error.name === SIGNERS_EMAIL_CONFLICT_ERROR
          ? 'Email співвласника та уповноваженої особи мають відрізнятися.'
          : 'Налаштування підписання неповні. Зверніться до уповноваженої особи ОСББ.';
      await markSheetDubidocSignFailed(sheet.id, message);
      return apiErrorResponse({
        status: 409,
        code: 'VOTE_SIGNING_NOT_CONFIGURED',
        message,
      });
    }

    console.error('[vote:sign-link] failed to prepare Dubidoc signing link', {
      sheetId: sheet.id,
      token,
      error,
    });
    const message = 'Сервіс підписання тимчасово недоступний. Спробуйте ще раз.';
    await markSheetDubidocSignFailed(sheet.id, message);
    return apiErrorResponse({
      status: 502,
      code: 'VOTE_SIGNING_UNAVAILABLE',
      message,
    });
  }

  if (!redirectUrl) {
    const message = 'Не вдалося підготувати документ для підписання. Спробуйте ще раз.';
    await markSheetDubidocSignFailed(sheet.id, message);
    return apiErrorResponse({
      status: 500,
      code: 'VOTE_SIGN_PREPARE_FAILED',
      message,
    });
  }

  await clearSheetDubidocSignState(sheet.id);

  return NextResponse.json({
    ok: true,
    message: 'Посилання на підпис готове.',
    redirectUrl,
  });
}
