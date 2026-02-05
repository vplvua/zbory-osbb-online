import crypto from 'node:crypto';

export const OTP_LENGTH = 4;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;

export function generateOtpCode(): string {
  const code = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return code.toString().padStart(OTP_LENGTH, '0');
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function hashOtpCode(phone: string, code: string, secret: string): string {
  const payload = `${phone}:${code}:${secret}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
