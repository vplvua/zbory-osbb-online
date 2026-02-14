'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  TOAST_EVENT_NAME,
  TOAST_FLASH_COOKIE_NAME,
  TOAST_QUERY_DURATION_KEY,
  TOAST_QUERY_MESSAGE_KEY,
  TOAST_QUERY_TYPE_KEY,
  type ToastPayload,
  type ToastType,
} from '@/lib/toast/types';

type ToastItem = ToastPayload & {
  id: string;
};

const DEFAULT_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4500,
  error: 6000,
};

function getToastStyles(type: ToastType): string {
  if (type === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (type === 'info') {
    return 'border-sky-200 bg-sky-50 text-sky-900';
  }

  return 'border-red-200 bg-red-50 text-red-900';
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.16" />
        <path
          d="m8 12.5 2.6 2.6L16.5 9.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'info') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.16" />
        <path
          d="M12 10v6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="7.5" r="1.1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.16" />
      <path
        d="M12 7.8v6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.4" r="1.1" fill="currentColor" />
    </svg>
  );
}

function parseFlashToastCookie(): ToastPayload | null {
  const cookiePrefix = `${TOAST_FLASH_COOKIE_NAME}=`;
  const encoded = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(cookiePrefix))
    ?.slice(cookiePrefix.length);

  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<ToastPayload>;
    if (
      (parsed.type === 'success' || parsed.type === 'error' || parsed.type === 'info') &&
      typeof parsed.message === 'string' &&
      parsed.message.length > 0
    ) {
      return {
        type: parsed.type,
        message: parsed.message,
        durationMs: parsed.durationMs,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function clearFlashToastCookie() {
  document.cookie = `${TOAST_FLASH_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const durationMs = toast.durationMs ?? DEFAULT_DURATION_MS[toast.type];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onClose(toast.id);
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, onClose, toast.id]);

  return (
    <section
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto rounded-lg border px-3.5 py-3 shadow-md backdrop-blur-sm',
        getToastStyles(toast.type),
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ToastIcon type={toast.type} />
          <p className="truncate text-sm leading-5">{toast.message}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-current/70 hover:bg-black/5 hover:text-current"
          onClick={() => onClose(toast.id)}
          aria-label="Закрити повідомлення"
        >
          ×
        </button>
      </div>
    </section>
  );
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleClose = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((payload: ToastPayload) => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setToasts((prev) => [...prev, { ...payload, id }]);
  }, []);

  const consumeFlashToast = useCallback(() => {
    const flashToast = parseFlashToastCookie();
    if (!flashToast) {
      return;
    }

    clearFlashToastCookie();
    pushToast(flashToast);
  }, [pushToast]);

  const consumeQueryToast = useCallback(() => {
    const url = new URL(window.location.href);
    const type = url.searchParams.get(TOAST_QUERY_TYPE_KEY);
    const message = url.searchParams.get(TOAST_QUERY_MESSAGE_KEY);
    const durationRaw = url.searchParams.get(TOAST_QUERY_DURATION_KEY);
    if (
      (type !== 'success' && type !== 'error' && type !== 'info') ||
      !message ||
      message.length === 0
    ) {
      return;
    }

    const parsedDuration =
      typeof durationRaw === 'string' && durationRaw.length > 0
        ? Number.parseInt(durationRaw, 10)
        : undefined;

    pushToast({
      type,
      message,
      durationMs: Number.isFinite(parsedDuration) ? parsedDuration : undefined,
    });

    url.searchParams.delete(TOAST_QUERY_TYPE_KEY);
    url.searchParams.delete(TOAST_QUERY_MESSAGE_KEY);
    url.searchParams.delete(TOAST_QUERY_DURATION_KEY);
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [pushToast]);

  useEffect(() => {
    const initialCheckId = window.setTimeout(() => {
      consumeFlashToast();
      consumeQueryToast();
    }, 0);
    const intervalId = window.setInterval(() => {
      consumeFlashToast();
      consumeQueryToast();
    }, 500);

    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
    };
  }, [consumeFlashToast, consumeQueryToast]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      if (!detail || typeof detail.message !== 'string' || detail.message.length === 0) {
        return;
      }

      if (detail.type !== 'success' && detail.type !== 'error' && detail.type !== 'info') {
        return;
      }

      pushToast(detail);
    };

    window.addEventListener(TOAST_EVENT_NAME, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, onToast);
    };
  }, [pushToast]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-[100] flex w-[calc(100%-2rem)] justify-start sm:w-auto"
    >
      <div className="flex w-full max-w-sm flex-col gap-2 sm:w-96">
        {toasts.map((toastItem) => (
          <ToastCard key={toastItem.id} toast={toastItem} onClose={handleClose} />
        ))}
      </div>
    </div>
  );
}
