import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getAuthSecret } from '@/lib/auth/secret';

type SessionPayload = {
  sub: string;
  phone: string;
  iat: number;
  exp: number;
};

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function verifyJwt(token: string, secret: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload?.sub || !payload?.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('zbory_session')?.value;
  if (!token) {
    return null;
  }

  return verifyJwt(token, getAuthSecret());
}
