import { SheetStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateAndStoreSheetPdf, PDF_TARGET_MS } from '@/lib/sheet/pdf-processing';
import { isValidPublicToken } from '@/lib/tokens';
import { getVoteSheetByToken } from '@/lib/vote/sheet';
import type { VoteSheetResponseDto, VoteSubmitResponseDto } from '@/lib/vote/types';
import { voteSubmitSchema } from '@/lib/vote/validation';

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

function validateAnswerSet(
  payloadQuestionIds: string[],
  protocolQuestionIds: string[],
): { ok: true } | { ok: false; message: string } {
  const uniqueQuestionIds = new Set(payloadQuestionIds);
  if (uniqueQuestionIds.size !== payloadQuestionIds.length) {
    return { ok: false, message: 'Питання не можуть повторюватися.' };
  }

  if (payloadQuestionIds.length !== protocolQuestionIds.length) {
    return { ok: false, message: 'Потрібно відповісти на всі питання.' };
  }

  const protocolQuestions = new Set(protocolQuestionIds);
  for (const questionId of payloadQuestionIds) {
    if (!protocolQuestions.has(questionId)) {
      return { ok: false, message: 'Відповідь містить невірне питання.' };
    }
  }

  return { ok: true };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const sheet = await getVoteSheetByToken(token);

  if (!sheet) {
    return NextResponse.json({ error: 'Листок не знайдено.' }, { status: 404 });
  }

  const response: VoteSheetResponseDto = { sheet };
  return NextResponse.json(response);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!isValidPublicToken(token)) {
    return NextResponse.json({ ok: false, message: 'Листок не знайдено.' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Невірні дані.' }, { status: 400 });
  }

  const parsed = voteSubmitSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Заповніть усі відповіді та підтвердьте згоду.' },
      { status: 400 },
    );
  }

  const sheet = await prisma.sheet.findUnique({
    where: { publicToken: token },
    include: {
      protocol: {
        select: {
          questions: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!sheet) {
    return NextResponse.json({ ok: false, message: 'Листок не знайдено.' }, { status: 404 });
  }

  const now = new Date();
  if (sheet.expiresAt <= now || sheet.status === SheetStatus.EXPIRED) {
    await markDraftAsExpired(sheet.id);
    return NextResponse.json(
      { ok: false, message: 'Термін голосування завершено.' },
      { status: 409 },
    );
  }

  if (sheet.status !== SheetStatus.DRAFT) {
    return NextResponse.json(
      { ok: false, message: 'Листок вже подано та очікує наступного етапу.' },
      { status: 409 },
    );
  }

  const answerSetValidation = validateAnswerSet(
    parsed.data.answers.map((answer) => answer.questionId),
    sheet.protocol.questions.map((question) => question.id),
  );

  if (!answerSetValidation.ok) {
    return NextResponse.json({ ok: false, message: answerSetValidation.message }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        parsed.data.answers.map((answer) =>
          tx.answer.upsert({
            where: {
              sheetId_questionId: {
                sheetId: sheet.id,
                questionId: answer.questionId,
              },
            },
            create: {
              sheetId: sheet.id,
              questionId: answer.questionId,
              vote: answer.vote,
            },
            update: {
              vote: answer.vote,
            },
          }),
        ),
      );

      // Mock signing start: simulate owner signing immediately for MVP.
      const updateResult = await tx.sheet.updateMany({
        where: {
          id: sheet.id,
          status: SheetStatus.DRAFT,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          status: SheetStatus.PENDING_ORGANIZER,
          ownerSignedAt: now,
        },
      });

      if (updateResult.count !== 1) {
        const conflictError = new Error('SHEET_STATE_CONFLICT');
        conflictError.name = 'SHEET_STATE_CONFLICT';
        throw conflictError;
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'SHEET_STATE_CONFLICT') {
      return NextResponse.json(
        { ok: false, message: 'Листок більше не доступний для подання.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { ok: false, message: 'Не вдалося зберегти голос. Спробуйте ще раз.' },
      { status: 500 },
    );
  }

  const pdfResult = await generateAndStoreSheetPdf(sheet.id);
  if (!pdfResult.ok) {
    console.error('[pdf] failed to generate sheet pdf', {
      sheetId: sheet.id,
      message: pdfResult.message,
    });
  } else if (pdfResult.generationMs > PDF_TARGET_MS) {
    console.warn(
      `[pdf] Sheet ${sheet.id} generated in ${pdfResult.generationMs}ms (target ${PDF_TARGET_MS}ms)`,
    );
  }

  const updatedSheet = await getVoteSheetByToken(token);
  if (!updatedSheet) {
    return NextResponse.json(
      { ok: false, message: 'Голос збережено, але не вдалося оновити дані листка.' },
      { status: 500 },
    );
  }

  const response: VoteSubmitResponseDto = {
    ok: true,
    message: 'Голос прийнято. Очікуємо підпису уповноваженої особи.',
    sheet: updatedSheet,
  };

  return NextResponse.json(response);
}
