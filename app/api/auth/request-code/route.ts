import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiErrorResponse } from '@/lib/api/error-response';
import { generateOtpCode, getOtpExpiry, hashOtpCode } from '@/lib/auth/otp';
import { getAuthSecret } from '@/lib/auth/secret';
import { getSmsAdapter } from '@/lib/sms/adapter';
import { isValidPhone, normalizePhone } from '@/lib/auth/validation';
import { checkOtpRateLimit, OTP_RATE_LIMIT } from '@/lib/auth/rate-limit';
import { SmsRateLimitAction } from '@prisma/client';

export async function POST(request: Request) {
  try {
    let payload: { phone?: string };
    try {
      payload = await request.json();
    } catch {
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_REQUEST_INVALID_JSON',
        message: 'Невірні дані.',
      });
    }

    const phone = normalizePhone(payload.phone ?? '');
    if (!isValidPhone(phone)) {
      return apiErrorResponse({
        status: 400,
        code: 'AUTH_REQUEST_INVALID_PHONE',
        message: 'Невірний формат номера телефону.',
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
      action: SmsRateLimitAction.REQUEST_CODE,
    });

    if (!rateLimit.allowed) {
      const retryAfterSeconds = rateLimit.retryAfterSeconds ?? OTP_RATE_LIMIT.windowMs / 1000;
      const retryMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
      return apiErrorResponse({
        status: 429,
        code: 'AUTH_REQUEST_RATE_LIMIT',
        message: `Забагато спроб. Спробуйте через ${retryMinutes} хв.`,
        details: { retryMinutes, retryAfterSeconds },
      });
    }

    const code = generateOtpCode();
    const codeHash = hashOtpCode(phone, code, getAuthSecret());
    const expiresAt = getOtpExpiry();

    const otp = await prisma.smsOtp.create({
      data: {
        phone,
        codeHash,
        expiresAt,
      },
    });

    const smsAdapter = getSmsAdapter();
    try {
      const sent = await smsAdapter.sendCode(phone, code);
      if (!sent) {
        await prisma.smsOtp.delete({ where: { id: otp.id } });
        return apiErrorResponse({
          status: 500,
          code: 'AUTH_REQUEST_SMS_SEND_FAILED',
          message: 'Не вдалося надіслати SMS. Спробуйте пізніше.',
        });
      }
    } catch {
      await prisma.smsOtp.delete({ where: { id: otp.id } });
      return apiErrorResponse({
        status: 500,
        code: 'AUTH_REQUEST_SMS_SEND_FAILED',
        message: 'Не вдалося надіслати SMS. Спробуйте пізніше.',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth:request-code] failed', { error });
    return apiErrorResponse({
      status: 500,
      code: 'AUTH_REQUEST_FAILED',
      message: 'Не вдалося надіслати код. Спробуйте пізніше.',
    });
  }
}
