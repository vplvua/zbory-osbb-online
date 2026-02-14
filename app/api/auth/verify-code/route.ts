import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiErrorResponse } from '@/lib/api/error-response';
import { hashOtpCode, OTP_MAX_ATTEMPTS } from '@/lib/auth/otp';
import { getAuthSecret } from '@/lib/auth/secret';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { isValidCode, isValidPhone, normalizePhone } from '@/lib/auth/validation';
import { checkOtpRateLimit, OTP_RATE_LIMIT } from '@/lib/auth/rate-limit';
import { SmsRateLimitAction } from '@prisma/client';

const INVALID_CODE_MESSAGE = 'Невірний код. Залишилось спроб: ';
const EXPIRED_CODE_MESSAGE = 'Код більше не дійсний. Запросіть новий код.';

export async function POST(request: Request) {
  try {
    let payload: { phone?: string; code?: string };

    try {
      payload = await request.json();
    } catch {
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_VERIFY_INVALID_JSON',
        message: 'Невірні дані.',
      });
    }

    const phone = normalizePhone(payload.phone ?? '');
    const code = (payload.code ?? '').trim();

    if (!isValidPhone(phone) || !isValidCode(code)) {
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_VERIFY_INVALID_INPUT',
        message: 'Невірні дані.',
      });
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
      const retryAfterSeconds = rateLimit.retryAfterSeconds ?? OTP_RATE_LIMIT.windowMs / 1000;
      const retryMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
      return apiErrorResponse({
        status: 429,
        code: 'AUTH_VERIFY_RATE_LIMIT',
        message: `Забагато спроб. Спробуйте через ${retryMinutes} хв.`,
        details: { retryMinutes, retryAfterSeconds },
      });
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
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_VERIFY_CODE_EXPIRED',
        message: EXPIRED_CODE_MESSAGE,
      });
    }

    if (otp.expiresAt < new Date()) {
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_VERIFY_CODE_EXPIRED',
        message: EXPIRED_CODE_MESSAGE,
      });
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_VERIFY_CODE_EXPIRED',
        message: EXPIRED_CODE_MESSAGE,
      });
    }

    const expectedHash = hashOtpCode(phone, code, getAuthSecret());
    if (expectedHash !== otp.codeHash) {
      const attempts = otp.attempts + 1;
      await prisma.smsOtp.update({
        where: { id: otp.id },
        data: { attempts },
      });

      const remainingAttempts = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
      const message =
        remainingAttempts === 0
          ? EXPIRED_CODE_MESSAGE
          : `${INVALID_CODE_MESSAGE}${remainingAttempts}`;

      return apiErrorResponse({
        status: 400,
        code: remainingAttempts === 0 ? 'AUTH_VERIFY_CODE_EXPIRED' : 'AUTH_VERIFY_CODE_INVALID',
        message,
        details: { remainingAttempts },
      });
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
  } catch (error) {
    console.error('[auth:verify-code] failed', { error });
    return apiErrorResponse({
      status: 500,
      code: 'AUTH_VERIFY_FAILED',
      message: 'Не вдалося підтвердити код. Спробуйте пізніше.',
    });
  }
}
