import crypto from 'node:crypto';

export const PUBLIC_TOKEN_MIN_LENGTH = 64;
export const PUBLIC_TOKEN_BYTES = 48;

const PUBLIC_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function generatePublicToken(): string {
  return crypto.randomBytes(PUBLIC_TOKEN_BYTES).toString('base64url');
}

export function isValidPublicToken(token: string): boolean {
  return token.length >= PUBLIC_TOKEN_MIN_LENGTH && PUBLIC_TOKEN_PATTERN.test(token);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
