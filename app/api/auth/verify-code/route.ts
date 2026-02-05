import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashOtpCode, OTP_MAX_ATTEMPTS } from '@/lib/auth/otp';
import { getAuthSecret } from '@/lib/auth/secret';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { isValidCode, isValidPhone, normalizePhone } from '@/lib/auth/validation';
import { checkOtpRateLimit, OTP_RATE_LIMIT } from '@/lib/auth/rate-limit';
import { SmsRateLimitAction } from '@prisma/client';

const INVALID_CODE_MESSAGE = 'Невірний код. Залишилось спроб: ';
const EXPIRED_CODE_MESSAGE = 'Код більше не дійсний. Запросіть новий код.';

export async function POST(request: Request) {
  let payload: { phone?: string; code?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Невірні дані.' }, { status: 400 });
  }

  const phone = normalizePhone(payload.phone ?? '');
  const code = (payload.code ?? '').trim();

  if (!isValidPhone(phone) || !isValidCode(code)) {
    return NextResponse.json({ ok: false, message: 'Невірні дані.' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined;

  const rateLimit = await checkOtpRateLimit({
    prisma,
    phone,
    ip,
    action: SmsRateLimitAction.VERIFY_CODE,
  });

  if (!rateLimit.allowed) {
    const retryMinutes = Math.max(
      1,
      Math.ceil((rateLimit.retryAfterSeconds ?? OTP_RATE_LIMIT.windowMs / 1000) / 60),
    );
    return NextResponse.json(
      { ok: false, message: `Забагато спроб. Спробуйте через ${retryMinutes} хв.` },
      { status: 429 },
    );
  }

  const otp = await prisma.smsOtp.findFirst({
    where: {
      phone,
      usedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    return NextResponse.json({ ok: false, message: EXPIRED_CODE_MESSAGE }, { status: 400 });
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, message: EXPIRED_CODE_MESSAGE }, { status: 400 });
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, message: EXPIRED_CODE_MESSAGE }, { status: 400 });
  }

  const expectedHash = hashOtpCode(phone, code, getAuthSecret());
  if (expectedHash !== otp.codeHash) {
    const attempts = otp.attempts + 1;
    await prisma.smsOtp.update({
      where: { id: otp.id },
      data: { attempts },
    });

    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    const message = remaining === 0 ? EXPIRED_CODE_MESSAGE : `${INVALID_CODE_MESSAGE}${remaining}`;

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  await prisma.smsOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  const token = createSessionToken(user.id, user.phone);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
