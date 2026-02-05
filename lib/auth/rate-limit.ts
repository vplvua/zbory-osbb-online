import type { PrismaClient, SmsRateLimitAction } from '@prisma/client';

export const OTP_RATE_LIMIT = {
  limit: 3,
  windowMs: 15 * 60 * 1000,
};

export function isRateLimited(count: number, limit = OTP_RATE_LIMIT.limit): boolean {
  return count >= limit;
}

export function getRetryAfterSeconds(
  now: Date,
  oldestAttempt: Date,
  windowMs = OTP_RATE_LIMIT.windowMs,
): number {
  const remainingMs = windowMs - (now.getTime() - oldestAttempt.getTime());
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

type RateLimitCheckInput = {
  prisma: PrismaClient;
  phone: string;
  ip?: string;
  action: SmsRateLimitAction;
  now?: Date;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export async function checkOtpRateLimit({
  prisma,
  phone,
  ip,
  action,
  now = new Date(),
}: RateLimitCheckInput): Promise<RateLimitResult> {
  const windowStart = new Date(now.getTime() - OTP_RATE_LIMIT.windowMs);

  const [count, oldestAttempt] = await Promise.all([
    prisma.smsRateLimit.count({
      where: {
        phone,
        action,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.smsRateLimit.findFirst({
      where: {
        phone,
        action,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (isRateLimited(count)) {
    const retryAfterSeconds = oldestAttempt
      ? getRetryAfterSeconds(now, oldestAttempt.createdAt)
      : Math.ceil(OTP_RATE_LIMIT.windowMs / 1000);

    return { allowed: false, retryAfterSeconds };
  }

  await prisma.smsRateLimit.create({
    data: {
      phone,
      ip,
      action,
      createdAt: now,
    },
  });

  return { allowed: true };
}
