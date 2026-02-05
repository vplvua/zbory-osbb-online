'use server';

import { redirect } from 'next/navigation';
import { Prisma, SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { ownerSchema } from '@/lib/owner/validation';
import { isValidPhone } from '@/lib/auth/validation';

export type OwnerFormState = {
  error?: string;
};

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

async function hasSignedSheet(ownerId: string) {
  const signed = await prisma.sheet.findFirst({
    where: { ownerId, status: SheetStatus.SIGNED },
    select: { id: true },
  });

  return Boolean(signed);
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

  if (await hasSignedSheet(owner.id)) {
    // TODO: Refine check for signed/active sheets once implemented.
    return { error: 'Неможливо редагувати співвласника з підписаними листками.' };
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

  if (await hasSignedSheet(owner.id)) {
    // TODO: Refine check for signed/active sheets once implemented.
    return { error: 'Неможливо видалити співвласника з підписаними листками.' };
  }

  await prisma.owner.delete({ where: { id: owner.id } });

  redirect(`/osbb/${owner.protocol.osbbId}/protocols/${owner.protocolId}/owners`);
}
