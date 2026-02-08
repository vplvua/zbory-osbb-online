'use server';

import { redirect } from 'next/navigation';
import { Prisma, SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { calculateSheetExpiresAt } from '@/lib/sheet/expiry';
import { generateAndStoreSheetPdf } from '@/lib/sheet/pdf-processing';
import { sheetCreateSchema } from '@/lib/sheet/validation';
import { generatePublicToken } from '@/lib/tokens';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

export type SheetFormState = {
  error?: string;
};

const PUBLIC_TOKEN_RETRY_LIMIT = 3;

function getSheetFormData(formData: FormData) {
  return {
    protocolId: String(formData.get('protocolId') ?? ''),
    ownerId: String(formData.get('ownerId') ?? ''),
    surveyDate: String(formData.get('surveyDate') ?? ''),
  };
}

function getUniqueTarget(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map(String);
  }

  if (typeof target === 'string') {
    return [target];
  }

  return [];
}

function isPublicTokenConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  return getUniqueTarget(error).some((part) => part.includes('publicToken'));
}

function isSheetProtocolOwnerConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const targets = getUniqueTarget(error);
  if (targets.some((part) => part.includes('Sheet_protocolId_ownerId_key'))) {
    return true;
  }

  return targets.includes('protocolId') && targets.includes('ownerId');
}

async function createSheetWithUniqueToken(data: {
  protocolId: string;
  ownerId: string;
  surveyDate: Date;
  expiresAt: Date;
}) {
  for (let attempt = 0; attempt < PUBLIC_TOKEN_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.sheet.create({
        data: {
          protocolId: data.protocolId,
          ownerId: data.ownerId,
          surveyDate: data.surveyDate,
          status: SheetStatus.DRAFT,
          publicToken: generatePublicToken(),
          expiresAt: data.expiresAt,
        },
      });
    } catch (error) {
      if (isPublicTokenConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('PUBLIC_TOKEN_COLLISION');
}

async function getSelectedOsbbId(userId: string): Promise<string | null> {
  const selectedState = await resolveSelectedOsbb(userId);
  return selectedState.selectedOsbb?.id ?? null;
}

export async function createSheetAction(
  _: SheetFormState,
  formData: FormData,
): Promise<SheetFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const selectedOsbbId = await getSelectedOsbbId(session.sub);
  if (!selectedOsbbId) {
    return { error: 'Оберіть ОСББ на дашборді.' };
  }

  const parsed = sheetCreateSchema.safeParse(getSheetFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте дані листка опитування.' };
  }

  const protocol = await prisma.protocol.findFirst({
    where: {
      id: parsed.data.protocolId,
      osbbId: selectedOsbbId,
      osbb: {
        userId: session.sub,
        isDeleted: false,
      },
    },
    select: {
      id: true,
      date: true,
      type: true,
    },
  });

  if (!protocol) {
    return { error: 'Протокол не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: parsed.data.ownerId,
      osbbId: selectedOsbbId,
    },
    select: { id: true },
  });

  if (!owner) {
    return { error: 'Співвласника не знайдено.' };
  }

  await prisma.protocolOwner.upsert({
    where: {
      protocolId_ownerId: {
        protocolId: protocol.id,
        ownerId: owner.id,
      },
    },
    update: {},
    create: {
      protocolId: protocol.id,
      ownerId: owner.id,
    },
  });

  const expiresAt = calculateSheetExpiresAt(protocol.date, protocol.type);

  let sheet: { id: string };
  try {
    sheet = await createSheetWithUniqueToken({
      protocolId: protocol.id,
      ownerId: owner.id,
      surveyDate: new Date(parsed.data.surveyDate),
      expiresAt,
    });
  } catch (error) {
    if (isSheetProtocolOwnerConflict(error)) {
      return { error: 'Для цього співвласника вже існує листок у вибраному протоколі.' };
    }

    throw error;
  }

  const pdfResult = await generateAndStoreSheetPdf(sheet.id);
  if (!pdfResult.ok) {
    return { error: 'Листок створено, але PDF не вдалося сформувати.' };
  }

  redirect('/sheets');
}

export async function retrySheetPdfAction(
  _: SheetFormState,
  formData: FormData,
): Promise<SheetFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const selectedOsbbId = await getSelectedOsbbId(session.sub);
  if (!selectedOsbbId) {
    return { error: 'Оберіть ОСББ на дашборді.' };
  }

  const sheetId = String(formData.get('sheetId') ?? '');
  if (!sheetId) {
    return { error: 'Листок не знайдено.' };
  }

  const sheet = await prisma.sheet.findFirst({
    where: {
      id: sheetId,
      protocol: {
        osbbId: selectedOsbbId,
        osbb: {
          userId: session.sub,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
      status: true,
      pdfFileUrl: true,
      pdfUploadPending: true,
      errorPending: true,
    },
  });

  if (!sheet) {
    return { error: 'Листок не знайдено.' };
  }

  if (sheet.pdfUploadPending) {
    return { error: 'PDF вже формується. Спробуйте пізніше.' };
  }

  if (sheet.status === SheetStatus.DRAFT) {
    return { error: 'Повторна генерація доступна лише після запуску підписання.' };
  }

  if (sheet.status === SheetStatus.EXPIRED && !sheet.pdfFileUrl) {
    return { error: 'Для простроченого листка без PDF повторна генерація недоступна.' };
  }

  const result = await generateAndStoreSheetPdf(sheet.id);
  if (!result.ok) {
    return { error: result.message };
  }

  redirect('/sheets');
}

export async function deleteSheetAction(
  _: SheetFormState,
  formData: FormData,
): Promise<SheetFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const selectedOsbbId = await getSelectedOsbbId(session.sub);
  if (!selectedOsbbId) {
    return { error: 'Оберіть ОСББ на дашборді.' };
  }

  const sheetId = String(formData.get('sheetId') ?? '');
  if (!sheetId) {
    return { error: 'Листок не знайдено.' };
  }

  const sheet = await prisma.sheet.findFirst({
    where: {
      id: sheetId,
      protocol: {
        osbbId: selectedOsbbId,
        osbb: {
          userId: session.sub,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
      status: true,
      ownerSignedAt: true,
      organizerSignedAt: true,
    },
  });

  if (!sheet) {
    return { error: 'Листок не знайдено.' };
  }

  const isMutableStatus =
    sheet.status === SheetStatus.DRAFT || sheet.status === SheetStatus.EXPIRED;
  const hasNoSignatures = sheet.ownerSignedAt === null && sheet.organizerSignedAt === null;

  if (!isMutableStatus || !hasNoSignatures) {
    return { error: 'Видалення дозволено тільки для чернеток/прострочених без підписів.' };
  }

  await prisma.sheet.delete({
    where: { id: sheet.id },
  });

  redirect('/sheets');
}
