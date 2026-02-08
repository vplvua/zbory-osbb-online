'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { protocolSchema } from '@/lib/protocol/validation';
import { questionSchema } from '@/lib/question/validation';
import { SheetStatus } from '@prisma/client';

export type ProtocolFormState = {
  error?: string;
};

function getProtocolFormData(formData: FormData) {
  return {
    number: String(formData.get('number') ?? ''),
    date: String(formData.get('date') ?? ''),
    type: String(formData.get('type') ?? ''),
  };
}

function getQuestionFormData(formData: FormData) {
  return {
    orderNumber: formData.get('orderNumber'),
    text: String(formData.get('text') ?? ''),
    proposal: String(formData.get('proposal') ?? ''),
    requiresTwoThirds: Boolean(formData.get('requiresTwoThirds')),
  };
}

type ParsedQuestionInput = {
  id?: string;
  orderNumber: number;
  text: string;
  proposal: string;
  requiresTwoThirds: boolean;
};

function parseQuestionsFromFormData(formData: FormData): ParsedQuestionInput[] {
  const questionMap = new Map<
    number,
    {
      id?: string;
      text?: string;
      proposal?: string;
      requiresTwoThirds: boolean;
    }
  >();

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^questions\.(\d+)\.(id|text|proposal|requiresTwoThirds)$/);
    if (!match) {
      continue;
    }

    const index = Number(match[1]);
    const field = match[2];

    if (!questionMap.has(index)) {
      questionMap.set(index, {
        requiresTwoThirds: false,
      });
    }

    const question = questionMap.get(index);
    if (!question) {
      continue;
    }

    if (field === 'requiresTwoThirds') {
      question.requiresTwoThirds = true;
      continue;
    }

    const stringValue = String(value ?? '').trim();
    if (field === 'id') {
      question.id = stringValue || undefined;
      continue;
    }

    if (field === 'text') {
      question.text = stringValue;
      continue;
    }

    question.proposal = stringValue;
  }

  return Array.from(questionMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, question]) => {
      const parsed = questionSchema.safeParse({
        orderNumber: index + 1,
        text: question.text ?? '',
        proposal: question.proposal ?? '',
        requiresTwoThirds: question.requiresTwoThirds,
      });

      if (!parsed.success) {
        throw new Error('QUESTION_VALIDATION_ERROR');
      }

      return {
        id: question.id,
        ...parsed.data,
      };
    });
}

async function ensureProtocolOwner(protocolId: string, userId: string) {
  return prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: {
        userId,
        isDeleted: false,
      },
    },
  });
}

async function ensureOsbbOwner(osbbId: string, userId: string) {
  return prisma.oSBB.findFirst({
    where: { id: osbbId, userId, isDeleted: false },
  });
}

async function hasSignedSheets(protocolId: string) {
  const signed = await prisma.sheet.findFirst({
    where: { protocolId, status: SheetStatus.SIGNED },
    select: { id: true },
  });

  return Boolean(signed);
}

export async function createProtocolAction(
  _: ProtocolFormState,
  formData: FormData,
): Promise<ProtocolFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const osbbId = String(formData.get('osbbId') ?? '');
  if (!osbbId) {
    return { error: 'ОСББ не знайдено.' };
  }

  const osbb = await ensureOsbbOwner(osbbId, session.sub);
  if (!osbb) {
    return { error: 'ОСББ не знайдено.' };
  }

  const parsed = protocolSchema.safeParse(getProtocolFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте номер протоколу, дату та тип.' };
  }

  const protocol = await prisma.protocol.create({
    data: {
      osbbId,
      number: parsed.data.number,
      date: new Date(parsed.data.date),
      type: parsed.data.type,
    },
  });

  redirect(`/osbb/${osbbId}/protocols/${protocol.id}/edit`);
}

export async function updateProtocolAction(
  _: ProtocolFormState,
  formData: FormData,
): Promise<ProtocolFormState> {
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

  if (await hasSignedSheets(protocolId)) {
    return { error: 'Неможливо редагувати протокол з підписаними листками.' };
  }

  const parsed = protocolSchema.safeParse(getProtocolFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте номер протоколу, дату та тип.' };
  }

  let questions: ParsedQuestionInput[] = [];
  try {
    questions = parseQuestionsFromFormData(formData);
  } catch {
    return {
      error: 'Перевірте всі питання: текст і пропозиція мають бути щонайменше 10 символів.',
    };
  }

  const duplicateQuestionIds = new Set<string>();
  for (const question of questions) {
    if (!question.id) {
      continue;
    }

    if (duplicateQuestionIds.has(question.id)) {
      return { error: 'Некоректні дані питань. Оновіть сторінку та спробуйте ще раз.' };
    }

    duplicateQuestionIds.add(question.id);
  }

  const existingQuestions = await prisma.question.findMany({
    where: { protocolId: protocol.id },
    select: { id: true },
  });
  const existingQuestionIds = new Set(existingQuestions.map((question) => question.id));
  const incomingQuestionIds = questions
    .map((question) => question.id)
    .filter((questionId): questionId is string => Boolean(questionId));

  for (const questionId of incomingQuestionIds) {
    if (!existingQuestionIds.has(questionId)) {
      return { error: 'Некоректні дані питань. Оновіть сторінку та спробуйте ще раз.' };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.protocol.update({
      where: { id: protocol.id },
      data: {
        number: parsed.data.number,
        date: new Date(parsed.data.date),
        type: parsed.data.type,
      },
    });

    if (incomingQuestionIds.length > 0) {
      await tx.question.deleteMany({
        where: {
          protocolId: protocol.id,
          id: { notIn: incomingQuestionIds },
        },
      });
    } else {
      await tx.question.deleteMany({
        where: { protocolId: protocol.id },
      });
    }

    for (const question of questions) {
      if (question.id) {
        await tx.question.update({
          where: { id: question.id },
          data: {
            orderNumber: question.orderNumber,
            text: question.text,
            proposal: question.proposal,
            requiresTwoThirds: question.requiresTwoThirds,
          },
        });
        continue;
      }

      await tx.question.create({
        data: {
          protocolId: protocol.id,
          orderNumber: question.orderNumber,
          text: question.text,
          proposal: question.proposal,
          requiresTwoThirds: question.requiresTwoThirds,
        },
      });
    }
  });

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/edit`);
}

export async function deleteProtocolAction(
  _: ProtocolFormState,
  formData: FormData,
): Promise<ProtocolFormState> {
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

  if (await hasSignedSheets(protocolId)) {
    return { error: 'Неможливо видалити протокол з підписаними листками.' };
  }

  await prisma.protocol.delete({ where: { id: protocol.id } });

  redirect(`/osbb/${protocol.osbbId}/protocols`);
}

export async function addQuestionAction(
  _: ProtocolFormState,
  formData: FormData,
): Promise<ProtocolFormState> {
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

  if (await hasSignedSheets(protocolId)) {
    return { error: 'Неможливо редагувати протокол з підписаними листками.' };
  }

  const parsed = questionSchema.safeParse(getQuestionFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте порядок, текст питання та пропозицію.' };
  }

  await prisma.question.create({
    data: {
      protocolId: protocol.id,
      orderNumber: parsed.data.orderNumber,
      text: parsed.data.text,
      proposal: parsed.data.proposal,
      requiresTwoThirds: parsed.data.requiresTwoThirds,
    },
  });

  redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/edit`);
}

export async function updateQuestionAction(
  _: ProtocolFormState,
  formData: FormData,
): Promise<ProtocolFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Потрібна авторизація.' };
  }

  const questionId = String(formData.get('questionId') ?? '');
  if (!questionId) {
    return { error: 'Питання не знайдено.' };
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      protocol: {
        osbb: { userId: session.sub, isDeleted: false },
      },
    },
    include: {
      protocol: true,
    },
  });

  if (!question) {
    return { error: 'Питання не знайдено.' };
  }

  if (await hasSignedSheets(question.protocolId)) {
    return { error: 'Неможливо редагувати протокол з підписаними листками.' };
  }

  const parsed = questionSchema.safeParse(getQuestionFormData(formData));
  if (!parsed.success) {
    return { error: 'Перевірте порядок, текст питання та пропозицію.' };
  }

  await prisma.question.update({
    where: { id: question.id },
    data: {
      orderNumber: parsed.data.orderNumber,
      text: parsed.data.text,
      proposal: parsed.data.proposal,
      requiresTwoThirds: parsed.data.requiresTwoThirds,
    },
  });

  redirect(`/osbb/${question.protocol.osbbId}/protocols/${question.protocolId}/edit`);
}

export async function deleteQuestionAction(
  _: ProtocolFormState,
  formData: FormData,
): Promise<ProtocolFormState> {
  const session = await getSessionPayload();
  if (!session) {
    return { error: 'Питання не знайдено.' };
  }

  const questionId = String(formData.get('questionId') ?? '');
  if (!questionId) {
    return { error: 'Питання не знайдено.' };
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      protocol: {
        osbb: { userId: session.sub, isDeleted: false },
      },
    },
    include: {
      protocol: true,
    },
  });

  if (!question) {
    return { error: 'Питання не знайдено.' };
  }

  if (await hasSignedSheets(question.protocolId)) {
    return { error: 'Неможливо редагувати протокол з підписаними листками.' };
  }

  await prisma.question.delete({ where: { id: question.id } });

  redirect(`/osbb/${question.protocol.osbbId}/protocols/${question.protocolId}/edit`);
}
