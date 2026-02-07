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

export type OwnerFormState = {
  error?: string;
};

export type SheetFormState = {
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
    fullName: String(formData.get('fullName') ?? ''),
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

function getSheetFormData(formData: FormData) {
  return {
    protocolId: String(formData.get('protocolId') ?? ''),
    ownerId: String(formData.get('ownerId') ?? ''),
    surveyDate: String(formData.get('surveyDate') ?? ''),
  };
}

function isPublicTokenConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes('publicToken');
  }

  if (typeof target === 'string') {
    return target.includes('publicToken');
  }

  return false;
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

  await prisma.owner.create({
    data: {
      protocolId: protocol.id,
      fullName: parsed.data.fullName,
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

export async function updateOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const ownerId = String(formData.get('ownerId') ?? '');
  if (!ownerId) {
    return { error: 'Співвласника не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      protocol: { osbb: { userId: session.sub, isDeleted: false } },
    },
    include: { protocol: true },
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
      fullName: parsed.data.fullName,
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

  redirect(`/osbb/${owner.protocol.osbbId}/protocols/${owner.protocolId}/owners`);
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
  if (!ownerId) {
    return { error: 'Співвласника не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      protocol: { osbb: { userId: session.sub, isDeleted: false } },
    },
    include: { protocol: true },
  });

  if (!owner) {
    return { error: 'Співвласника не знайдено.' };
  }

  if (await hasAnySheet(owner.id)) {
    return { error: 'Неможливо видалити співвласника зі створеними листками.' };
  }

  await prisma.owner.delete({ where: { id: owner.id } });

  redirect(`/osbb/${owner.protocol.osbbId}/protocols/${owner.protocolId}/owners`);
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

  const owner = await prisma.owner.findFirst({
    where: {
      id: parsed.data.ownerId,
      protocolId: parsed.data.protocolId,
      protocol: {
        osbb: { userId: session.sub, isDeleted: false },
      },
    },
    include: {
      protocol: {
        select: {
          id: true,
          osbbId: true,
          type: true,
          date: true,
        },
      },
    },
  });

  if (!owner) {
    return { error: 'Співвласника або протокол не знайдено.' };
  }

  const surveyDate = new Date(parsed.data.surveyDate);
  const expiresAt = calculateSheetExpiresAt(owner.protocol.date, owner.protocol.type);

  if (expiresAt <= new Date()) {
    return { error: 'Неможливо створити листок: максимальний термін опитування минув.' };
  }

  try {
    await createSheetWithUniqueToken({
      protocolId: owner.protocolId,
      ownerId: owner.id,
      surveyDate,
      expiresAt,
    });
  } catch {
    return { error: 'Не вдалося створити листок. Спробуйте ще раз.' };
  }

  redirect(`/osbb/${owner.protocol.osbbId}/protocols/${owner.protocolId}/owners`);
}
