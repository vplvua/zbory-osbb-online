'use client';

import type { ToastPayload } from '@/lib/toast/types';
import { TOAST_EVENT_NAME } from '@/lib/toast/types';

type ToastOptions = {
  durationMs?: number;
};

function dispatchToast(payload: ToastPayload) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT_NAME, { detail: payload }));
}

export const toast = {
  success(message: string, options?: ToastOptions) {
    dispatchToast({ type: 'success', message, durationMs: options?.durationMs });
  },
  error(message: string, options?: ToastOptions) {
    dispatchToast({ type: 'error', message, durationMs: options?.durationMs });
  },
  info(message: string, options?: ToastOptions) {
    dispatchToast({ type: 'info', message, durationMs: options?.durationMs });
  },
};
