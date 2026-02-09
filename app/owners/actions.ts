'use server';

import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { isValidPhone } from '@/lib/auth/validation';
import { ownerSchema } from '@/lib/owner/validation';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

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

function calcOwnedArea(totalArea: number, numerator: number, denominator: number) {
  const total = new Prisma.Decimal(totalArea);
  const owned = total.mul(numerator).div(denominator);
  return new Prisma.Decimal(owned.toFixed(2));
}

async function hasAnySheet(ownerId: string) {
  const sheet = await prisma.sheet.findFirst({
    where: { ownerId },
    select: { id: true },
  });

  return Boolean(sheet);
}

async function hasAnySheetForApartment(osbbId: string, apartmentNumber: string) {
  const sheet = await prisma.sheet.findFirst({
    where: {
      owner: {
        osbbId,
        apartmentNumber,
      },
    },
    select: { id: true },
  });

  return Boolean(sheet);
}

async function getSelectedOsbbOrError(userId: string): Promise<{ id: string } | null> {
  const selectedState = await resolveSelectedOsbb(userId);
  return selectedState.selectedOsbb ? { id: selectedState.selectedOsbb.id } : null;
}

export async function createOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const selectedOsbb = await getSelectedOsbbOrError(session.sub);
  if (!selectedOsbb) {
    return { error: 'Оберіть ОСББ на дашборді.' };
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
      osbbId: selectedOsbb.id,
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

  redirect('/owners');
}

export async function updateOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const selectedOsbb = await getSelectedOsbbOrError(session.sub);
  if (!selectedOsbb) {
    return { error: 'Оберіть ОСББ на дашборді.' };
  }

  const ownerId = String(formData.get('ownerId') ?? '');
  if (!ownerId) {
    return { error: 'Співвласника не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      osbbId: selectedOsbb.id,
      osbb: {
        userId: session.sub,
        isDeleted: false,
      },
    },
    select: { id: true, apartmentNumber: true },
  });

  if (!owner) {
    return { error: 'Співвласника не знайдено.' };
  }

  if (await hasAnySheetForApartment(selectedOsbb.id, owner.apartmentNumber)) {
    return {
      error: 'Неможливо редагувати співвласника, для цієї квартири вже є листки опитування.',
    };
  }

  const parsed = ownerSchema.safeParse(getOwnerFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте обовʼязкові поля співвласника.' };
  }

  if (
    owner.apartmentNumber !== parsed.data.apartmentNumber &&
    (await hasAnySheetForApartment(selectedOsbb.id, parsed.data.apartmentNumber))
  ) {
    return {
      error: 'Неможливо змінити номер квартири, для цієї квартири вже створені листки опитування.',
    };
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

  redirect('/owners');
}

export async function deleteOwnerAction(
  _: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const selectedOsbb = await getSelectedOsbbOrError(session.sub);
  if (!selectedOsbb) {
    return { error: 'Оберіть ОСББ на дашборді.' };
  }

  const ownerId = String(formData.get('ownerId') ?? '');
  if (!ownerId) {
    return { error: 'Співвласника не знайдено.' };
  }

  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      osbbId: selectedOsbb.id,
      osbb: {
        userId: session.sub,
        isDeleted: false,
      },
    },
    select: { id: true },
  });

  if (!owner) {
    return { error: 'Співвласника не знайдено.' };
  }

  if (await hasAnySheet(owner.id)) {
    return { error: 'Неможливо видалити співвласника зі створеними листками.' };
  }

  await prisma.owner.delete({
    where: { id: owner.id },
  });

  redirect('/owners');
}
