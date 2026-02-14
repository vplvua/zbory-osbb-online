'use server';

import { Prisma, SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { calculateSheetExpiresAt } from '@/lib/sheet/expiry';
import { generateAndStoreSheetPdf } from '@/lib/sheet/pdf-processing';
import { sheetBulkCreateSchema } from '@/lib/sheet/validation';
import { generatePublicToken } from '@/lib/tokens';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';
import { redirectWithToast } from '@/lib/toast/server';

export type SheetFormState = {
  error?: string;
};

const PUBLIC_TOKEN_RETRY_LIMIT = 3;
const DEFAULT_SHEETS_REDIRECT_PATH = '/sheets';

function getSheetFormData(formData: FormData) {
  const ownerIds = Array.from(
    new Set(
      formData
        .getAll('ownerIds')
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0),
    ),
  );

  return {
    protocolId: String(formData.get('protocolId') ?? ''),
    ownerIds,
    surveyDate: String(formData.get('surveyDate') ?? ''),
  };
}

function getSheetsRedirectPath(formData: FormData): string {
  const rawTarget = String(formData.get('redirectTo') ?? '').trim();
  if (!rawTarget || rawTarget.startsWith('//') || !rawTarget.startsWith('/')) {
    return DEFAULT_SHEETS_REDIRECT_PATH;
  }

  try {
    const parsed = new URL(rawTarget, 'http://localhost');
    if (parsed.pathname !== '/sheets') {
      return DEFAULT_SHEETS_REDIRECT_PATH;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_SHEETS_REDIRECT_PATH;
  }
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

  const parsed = sheetBulkCreateSchema.safeParse(getSheetFormData(formData));
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

  const owners = await prisma.owner.findMany({
    where: {
      id: {
        in: parsed.data.ownerIds,
      },
      osbbId: selectedOsbbId,
    },
    select: { id: true },
  });

  if (owners.length !== parsed.data.ownerIds.length) {
    return { error: 'Частину співвласників не знайдено. Оновіть сторінку та спробуйте ще раз.' };
  }

  const existingSheetsCount = await prisma.sheet.count({
    where: {
      protocolId: protocol.id,
      ownerId: {
        in: parsed.data.ownerIds,
      },
    },
  });

  if (existingSheetsCount > 0) {
    return {
      error:
        existingSheetsCount === 1
          ? 'Для одного зі співвласників вже існує листок у вибраному протоколі.'
          : `Для ${existingSheetsCount} співвласників вже існують листки у вибраному протоколі.`,
    };
  }

  await prisma.protocolOwner.createMany({
    data: parsed.data.ownerIds.map((ownerId) => ({
      protocolId: protocol.id,
      ownerId,
    })),
    skipDuplicates: true,
  });

  const expiresAt = calculateSheetExpiresAt(protocol.date, protocol.type);
  const surveyDate = new Date(parsed.data.surveyDate);
  const createdSheetIds: string[] = [];

  for (const ownerId of parsed.data.ownerIds) {
    try {
      const sheet = await createSheetWithUniqueToken({
        protocolId: protocol.id,
        ownerId,
        surveyDate,
        expiresAt,
      });
      createdSheetIds.push(sheet.id);
    } catch (error) {
      if (isSheetProtocolOwnerConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  if (createdSheetIds.length === 0) {
    return { error: 'Для обраних співвласників вже існують листки у вибраному протоколі.' };
  }

  if (createdSheetIds.length === 1) {
    const pdfResult = await generateAndStoreSheetPdf(createdSheetIds[0]);
    if (!pdfResult.ok) {
      return { error: 'Листок створено, але PDF не вдалося сформувати.' };
    }
  } else {
    for (const sheetId of createdSheetIds) {
      await generateAndStoreSheetPdf(sheetId);
    }
  }

  const createdSheetsCount = createdSheetIds.length;
  const successMessage =
    createdSheetsCount === 1
      ? 'Листок опитування успішно створено.'
      : `Успішно створено ${createdSheetsCount} листків опитування.`;

  return redirectWithToast(getSheetsRedirectPath(formData), {
    type: 'success',
    message: successMessage,
  });
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

  return redirectWithToast(getSheetsRedirectPath(formData), {
    type: 'success',
    message: 'PDF листка успішно сформовано.',
  });
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

  return redirectWithToast(getSheetsRedirectPath(formData), {
    type: 'success',
    message: 'Листок опитування успішно видалено.',
  });
}
