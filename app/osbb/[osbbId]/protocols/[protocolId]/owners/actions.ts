'use server';

import { redirect } from 'next/navigation';
import { Prisma, SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { ownerSchema } from '@/lib/owner/validation';
import { isValidPhone } from '@/lib/auth/validation';
import { sheetCreateSchema } from '@/lib/sheet/validation';
import { calculateSheetExpiresAt } from '@/lib/sheet/expiry';
import { generatePublicToken } from '@/lib/tokens';
import { generateAndStoreSheetPdf } from '@/lib/sheet/pdf-processing';

export type OwnerFormState = {
  error?: string;
};

export type SheetFormState = {
  error?: string;
};

export type ProtocolOwnerFormState = {
  error?: string;
};

const PUBLIC_TOKEN_RETRY_LIMIT = 3;

function normalizeOptional(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getOwnerFormData(formData: FormData) {
  return {
    lastName: String(formData.get('lastName') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    middleName: String(formData.get('middleName') ?? ''),
    apartmentNumber: String(formData.get('apartmentNumber') ?? ''),
    totalArea: formData.get('totalArea'),
    ownershipNumerator: formData.get('ownershipNumerator'),
    ownershipDenominator: formData.get('ownershipDenominator'),
    ownershipDocument: String(formData.get('ownershipDocument') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    representativeName: String(formData.get('representativeName') ?? ''),
    representativeDocument: String(formData.get('representativeDocument') ?? ''),
  };
}

async function ensureProtocolOwner(protocolId: string, userId: string) {
  return prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: { userId, isDeleted: false },
    },
  });
}

async function hasAnySheet(ownerId: string) {
  const sheet = await prisma.sheet.findFirst({
    where: { ownerId },
    select: { id: true },
  });

  return Boolean(sheet);
}

async function hasSheetForProtocolOwner(protocolId: string, ownerId: string) {
  const sheet = await prisma.sheet.findFirst({
    where: { protocolId, ownerId },
    select: { id: true },
  });

  return Boolean(sheet);
}

function getSheetFormData(formData: FormData) {
  return {
    protocolId: String(formData.get('protocolId') ?? ''),
    ownerId: String(formData.get('ownerId') ?? ''),
    surveyDate: String(formData.get('surveyDate') ?? ''),
  };
}

function getProtocolOwnerFormData(formData: FormData) {
  return {
    protocolId: String(formData.get('protocolId') ?? ''),
    ownerId: String(formData.get('ownerId') ?? ''),
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

function isProtocolOwnerConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const targets = getUniqueTarget(error);
  if (targets.some((part) => part.includes('ProtocolOwner_protocolId_ownerId_key'))) {
    return true;
  }

  return targets.includes('protocolId') && targets.includes('ownerId');
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

function calcOwnedArea(totalArea: number, numerator: number, denominator: number) {
  const total = new Prisma.Decimal(totalArea);
  const owned = total.mul(numerator).div(denominator);
  return new Prisma.Decimal(owned.toFixed(2));
}

export async function createOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const protocolId = String(formData.get('protocolId') ?? '');
  if (!protocolId) {
    return { error: 'Протокол не знайдено.' };
  }

  const protocol = await ensureProtocolOwner(protocolId, session.sub);
  if (!protocol) {
    return { error: 'Протокол не знайдено.' };
  }

  const parsed = ownerSchema.safeParse(getOwnerFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте обовʼязкові поля співвласника.' };
  }

  if (parsed.data.phone && !isValidPhone(parsed.data.phone)) {
    return { error: 'Невірний формат номера телефону.' };
  }

  const ownedArea = calcOwnedArea(
    parsed.data.totalArea,
    parsed.data.ownershipNumerator,
    parsed.data.ownershipDenominator,
  );

  await prisma.$transaction(async (tx) => {
    const owner = await tx.owner.create({
      data: {
        osbbId: protocol.osbbId,
        lastName: parsed.data.lastName,
        firstName: parsed.data.firstName,
        middleName: parsed.data.middleName,
        apartmentNumber: parsed.data.apartmentNumber,
        totalArea: new Prisma.Decimal(parsed.data.totalArea),
        ownershipNumerator: parsed.data.ownershipNumerator,
        ownershipDenominator: parsed.data.ownershipDenominator,
        ownedArea,
        ownershipDocument: parsed.data.ownershipDocument,
        email: normalizeOptional(parsed.data.email),
        phone: normalizeOptional(parsed.data.phone),
        representativeName: normalizeOptional(parsed.data.representativeName),
        representativeDocument: normalizeOptional(parsed.data.representativeDocument),
      },
    });

    await tx.protocolOwner.create({
      data: {
        protocolId: protocol.id,
        ownerId: owner.id,
      },
    });
  });

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`);
}

export async function attachOwnerToProtocolAction(
  _: ProtocolOwnerFormState,
  formData: FormData,
): Promise<ProtocolOwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const parsed = getProtocolOwnerFormData(formData);
  if (!parsed.protocolId || !parsed.ownerId) {
    return { error: 'Невірні дані співвласника або протоколу.' };
  }

  const protocol = await ensureProtocolOwner(parsed.protocolId, session.sub);
  if (!protocol) {
    return { error: 'Протокол не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: parsed.ownerId,
      osbbId: protocol.osbbId,
    },
    select: { id: true },
  });

  if (!owner) {
    return { error: 'Співвласника не знайдено в цьому ОСББ.' };
  }

  try {
    await prisma.protocolOwner.create({
      data: {
        protocolId: protocol.id,
        ownerId: owner.id,
      },
    });
  } catch (error) {
    if (isProtocolOwnerConflict(error)) {
      return { error: 'Цього співвласника вже додано до протоколу.' };
    }

    throw error;
  }

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`);
}

export async function updateOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const ownerId = String(formData.get('ownerId') ?? '');
  const protocolId = String(formData.get('protocolId') ?? '');

  if (!ownerId || !protocolId) {
    return { error: 'Співвласника не знайдено.' };
  }

  const protocol = await ensureProtocolOwner(protocolId, session.sub);
  if (!protocol) {
    return { error: 'Протокол не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      osbbId: protocol.osbbId,
    },
    select: { id: true },
  });

  if (!owner) {
    return { error: 'Співвласника не знайдено.' };
  }

  if (await hasAnySheet(owner.id)) {
    return { error: 'Неможливо редагувати співвласника зі створеними листками.' };
  }

  const parsed = ownerSchema.safeParse(getOwnerFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте обовʼязкові поля співвласника.' };
  }

  if (parsed.data.phone && !isValidPhone(parsed.data.phone)) {
    return { error: 'Невірний формат номера телефону.' };
  }

  const ownedArea = calcOwnedArea(
    parsed.data.totalArea,
    parsed.data.ownershipNumerator,
    parsed.data.ownershipDenominator,
  );

  await prisma.owner.update({
    where: { id: owner.id },
    data: {
      lastName: parsed.data.lastName,
      firstName: parsed.data.firstName,
      middleName: parsed.data.middleName,
      apartmentNumber: parsed.data.apartmentNumber,
      totalArea: new Prisma.Decimal(parsed.data.totalArea),
      ownershipNumerator: parsed.data.ownershipNumerator,
      ownershipDenominator: parsed.data.ownershipDenominator,
      ownedArea,
      ownershipDocument: parsed.data.ownershipDocument,
      email: normalizeOptional(parsed.data.email),
      phone: normalizeOptional(parsed.data.phone),
      representativeName: normalizeOptional(parsed.data.representativeName),
      representativeDocument: normalizeOptional(parsed.data.representativeDocument),
    },
  });

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`);
}

export async function deleteOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const ownerId = String(formData.get('ownerId') ?? '');
  const protocolId = String(formData.get('protocolId') ?? '');
  if (!ownerId || !protocolId) {
    return { error: 'Співвласника не знайдено.' };
  }

  const protocol = await ensureProtocolOwner(protocolId, session.sub);
  if (!protocol) {
    return { error: 'Протокол не знайдено.' };
  }

  const protocolOwner = await prisma.protocolOwner.findFirst({
    where: {
      protocolId: protocol.id,
      ownerId,
      owner: {
        osbbId: protocol.osbbId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!protocolOwner) {
    return { error: 'Співвласника не знайдено у цьому протоколі.' };
  }

  if (await hasSheetForProtocolOwner(protocol.id, ownerId)) {
    return {
      error: 'Неможливо видалити співвласника з протоколу, поки для нього є створені листки.',
    };
  }

  await prisma.protocolOwner.delete({ where: { id: protocolOwner.id } });

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`);
}

export async function createSheetAction(
  _: SheetFormState,
  formData: FormData,
): Promise<SheetFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const parsed = sheetCreateSchema.safeParse(getSheetFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте дату опитування.' };
  }

  const protocol = await ensureProtocolOwner(parsed.data.protocolId, session.sub);
  if (!protocol) {
    return { error: 'Протокол не знайдено.' };
  }

  const protocolOwner = await prisma.protocolOwner.findFirst({
    where: {
      protocolId: protocol.id,
      ownerId: parsed.data.ownerId,
      owner: {
        osbbId: protocol.osbbId,
      },
    },
    select: {
      ownerId: true,
    },
  });

  if (!protocolOwner) {
    return { error: 'Співвласника не додано до цього протоколу.' };
  }

  const surveyDate = new Date(parsed.data.surveyDate);
  const expiresAt = calculateSheetExpiresAt(protocol.date, protocol.type);

  if (expiresAt <= new Date()) {
    return { error: 'Неможливо створити листок: максимальний термін опитування минув.' };
  }

  try {
    await createSheetWithUniqueToken({
      protocolId: protocol.id,
      ownerId: protocolOwner.ownerId,
      surveyDate,
      expiresAt,
    });
  } catch (error) {
    if (isSheetProtocolOwnerConflict(error)) {
      return { error: 'Для цього співвласника листок у цьому протоколі вже існує.' };
    }

    return { error: 'Не вдалося створити листок. Спробуйте ще раз.' };
  }

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`);
}

export async function retrySheetPdfAction(
  _: SheetFormState,
  formData: FormData,
): Promise<SheetFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const sheetId = String(formData.get('sheetId') ?? '');
  if (!sheetId) {
    return { error: 'Листок не знайдено.' };
  }

  const sheet = await prisma.sheet.findFirst({
    where: {
      id: sheetId,
      protocol: {
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
      protocolId: true,
      protocol: {
        select: {
          osbbId: true,
        },
      },
    },
  });

  if (!sheet) {
    return { error: 'Листок не знайдено.' };
  }

  if (sheet.pdfUploadPending) {
    return { error: 'Обробка PDF вже виконується. Спробуйте трохи пізніше.' };
  }

  if (sheet.status === SheetStatus.DRAFT) {
    return {
      error: 'Повторна генерація PDF доступна лише після подання голосу співвласником.',
    };
  }

  if (sheet.status === SheetStatus.EXPIRED && !sheet.pdfFileUrl) {
    return { error: 'Листок прострочений. Повторна генерація PDF недоступна.' };
  }

  const result = await generateAndStoreSheetPdf(sheet.id);
  if (!result.ok) {
    return { error: 'Не вдалося сформувати PDF. Спробуйте ще раз.' };
  }

  redirect(`/osbb/${sheet.protocol.osbbId}/protocols/${sheet.protocolId}/owners`);
}

export async function deleteSheetAction(
  _: SheetFormState,
  formData: FormData,
): Promise<SheetFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const sheetId = String(formData.get('sheetId') ?? '');
  if (!sheetId) {
    return { error: 'Листок не знайдено.' };
  }

  const sheet = await prisma.sheet.findFirst({
    where: {
      id: sheetId,
      protocol: {
        osbb: {
          userId: session.sub,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
      protocolId: true,
      status: true,
      ownerSignedAt: true,
      organizerSignedAt: true,
      protocol: {
        select: {
          osbbId: true,
        },
      },
    },
  });

  if (!sheet) {
    return { error: 'Листок не знайдено.' };
  }

  const canDeleteByStatus =
    sheet.status === SheetStatus.DRAFT || sheet.status === SheetStatus.EXPIRED;
  const hasNoSignatures = sheet.ownerSignedAt === null && sheet.organizerSignedAt === null;

  if (!canDeleteByStatus || !hasNoSignatures) {
    return { error: 'Можна видалити лише непідписаний листок.' };
  }

  await prisma.sheet.delete({
    where: {
      id: sheet.id,
    },
  });

  redirect(`/osbb/${sheet.protocol.osbbId}/protocols/${sheet.protocolId}/owners`);
}
