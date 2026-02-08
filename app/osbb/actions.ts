'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { osbbSchema } from '@/lib/osbb/validation';

export type OsbbFormState = {
  error?: string;
};

function getFormData(formData: FormData) {
  return {
    name: String(formData.get('name') ?? ''),
    shortName: String(formData.get('shortName') ?? ''),
    address: String(formData.get('address') ?? ''),
    edrpou: String(formData.get('edrpou') ?? ''),
  };
}

export async function createOsbbAction(_: OsbbFormState, formData: FormData) {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const parsed = osbbSchema.safeParse(getFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте поля: повна назва, коротка назва, адреса, ЄДРПОУ (8 цифр).' };
  }

  await prisma.oSBB.create({
    data: {
      userId: session.sub,
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      address: parsed.data.address,
      edrpou: parsed.data.edrpou,
    },
  });

  redirect('/osbb');
}

export async function updateOsbbAction(
  _: OsbbFormState,
  formData: FormData,
): Promise<OsbbFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const id = String(formData.get('id') ?? '');
  if (!id) {
    return { error: 'ОСББ не знайдено.' };
  }

  const parsed = osbbSchema.safeParse(getFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте поля: повна назва, коротка назва, адреса, ЄДРПОУ (8 цифр).' };
  }

  const osbb = await prisma.oSBB.findFirst({
    where: {
      id,
      userId: session.sub,
      isDeleted: false,
    },
  });

  if (!osbb) {
    return { error: 'ОСББ не знайдено.' };
  }

  await prisma.oSBB.update({
    where: { id: osbb.id },
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      address: parsed.data.address,
      edrpou: parsed.data.edrpou,
    },
  });

  redirect('/osbb');
}

export async function deleteOsbbAction(
  _: OsbbFormState,
  formData: FormData,
): Promise<OsbbFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const id = String(formData.get('id') ?? '');
  if (!id) {
    return { error: 'ОСББ не знайдено.' };
  }

  const osbb = await prisma.oSBB.findFirst({
    where: {
      id,
      userId: session.sub,
      isDeleted: false,
    },
    include: {
      protocols: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!osbb) {
    return { error: 'ОСББ не знайдено.' };
  }

  if (osbb.protocols.length > 0) {
    // TODO: Refine check to only block when there are active sheets/polls.
    return { error: 'Неможливо видалити ОСББ з активними опитуваннями.' };
  }

  await prisma.oSBB.update({
    where: { id: osbb.id },
    data: { isDeleted: true },
  });

  redirect('/osbb');
}
