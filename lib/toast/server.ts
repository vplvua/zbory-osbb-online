import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  TOAST_FLASH_COOKIE_NAME,
  TOAST_QUERY_DURATION_KEY,
  TOAST_QUERY_MESSAGE_KEY,
  TOAST_QUERY_TYPE_KEY,
  type ToastPayload,
} from '@/lib/toast/types';

function encodeToast(payload: ToastPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export async function setFlashToast(payload: ToastPayload) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: TOAST_FLASH_COOKIE_NAME,
    value: encodeToast(payload),
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60,
  });
}

function buildRedirectPathWithToast(path: string, payload: ToastPayload): string {
  const parsed = new URL(path, 'http://localhost');
  parsed.searchParams.set(TOAST_QUERY_TYPE_KEY, payload.type);
  parsed.searchParams.set(TOAST_QUERY_MESSAGE_KEY, payload.message);
  if (typeof payload.durationMs === 'number') {
    parsed.searchParams.set(TOAST_QUERY_DURATION_KEY, String(payload.durationMs));
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export async function redirectWithToast(path: string, payload: ToastPayload): Promise<never> {
  await setFlashToast(payload);
  redirect(buildRedirectPathWithToast(path, payload));
}
