import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { isValidPhone } from '@/lib/auth/validation';

const SettingsSchema = z.object({
  organizerName: z.string().trim().min(2).max(200),
  organizerEmail: z.string().trim().email().optional().or(z.literal('')),
  organizerPhone: z.string().trim().optional().or(z.literal('')),
  organizerPosition: z.string().trim().max(200).optional().or(z.literal('')),
  // Integration keys are kept for future per-user mode.
  // MVP runtime uses global env keys for all users.
  dubidocApiKey: z.string().trim().max(500).optional().or(z.literal('')),
  dubidocOrgId: z.string().trim().max(200).optional().or(z.literal('')),
  turboSmsApiKey: z.string().trim().max(500).optional().or(z.literal('')),
  openAiApiKey: z.string().trim().max(500).optional().or(z.literal('')),
});

function normalizeOptional(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Потрібна авторизація.' }, { status: 401 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.sub },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      organizerName: settings?.organizerName ?? '',
      organizerEmail: settings?.organizerEmail ?? '',
      organizerPhone: settings?.organizerPhone ?? '',
      organizerPosition: settings?.organizerPosition ?? '',
      dubidocApiKey: settings?.dubidocApiKey ?? '',
      dubidocOrgId: settings?.dubidocOrgId ?? '',
      turboSmsApiKey: settings?.turboSmsApiKey ?? '',
      openAiApiKey: settings?.openAiApiKey ?? '',
    },
  });
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Потрібна авторизація.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Невірні дані.' }, { status: 400 });
  }

  const parsed = SettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Невірні дані.' }, { status: 400 });
  }

  const data = parsed.data;
  if (data.organizerPhone && !isValidPhone(data.organizerPhone)) {
    return NextResponse.json(
      { ok: false, message: 'Невірний формат номера телефону.' },
      { status: 400 },
    );
  }

  // TODO: Encrypt API keys at rest (AES-256) before storing in DB.
  await prisma.userSettings.upsert({
    where: { userId: session.sub },
    update: {
      organizerName: data.organizerName,
      organizerEmail: normalizeOptional(data.organizerEmail),
      organizerPhone: normalizeOptional(data.organizerPhone),
      organizerPosition: normalizeOptional(data.organizerPosition),
      dubidocApiKey: normalizeOptional(data.dubidocApiKey),
      dubidocOrgId: normalizeOptional(data.dubidocOrgId),
      turboSmsApiKey: normalizeOptional(data.turboSmsApiKey),
      openAiApiKey: normalizeOptional(data.openAiApiKey),
    },
    create: {
      userId: session.sub,
      organizerName: data.organizerName,
      organizerEmail: normalizeOptional(data.organizerEmail),
      organizerPhone: normalizeOptional(data.organizerPhone),
      organizerPosition: normalizeOptional(data.organizerPosition),
      dubidocApiKey: normalizeOptional(data.dubidocApiKey),
      dubidocOrgId: normalizeOptional(data.dubidocOrgId),
      turboSmsApiKey: normalizeOptional(data.turboSmsApiKey),
      openAiApiKey: normalizeOptional(data.openAiApiKey),
    },
  });

  return NextResponse.json({ ok: true });
}
