'use client';

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { readJsonBody, resolveApiErrorMessage, type ApiErrorCodeMap } from '@/lib/api/client-error';
import { toast } from '@/lib/toast/client';

type DownloadActionButtonProps = {
  href: string;
  label: ReactNode;
  pendingLabel?: ReactNode;
  variant?: 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
  onDownloadStart?: () => void;
};

const UNKNOWN_DOWNLOAD_ERROR_MESSAGE = 'Не вдалося завантажити файл. Спробуйте ще раз.';
const DOWNLOAD_ERROR_MAP: ApiErrorCodeMap = {
  DOWNLOAD_UNAUTHORIZED: 'Потрібна авторизація.',
  DOWNLOAD_INVALID_KIND: 'Невірний тип файлу.',
  DOWNLOAD_SHEET_NOT_FOUND: 'Листок не знайдено.',
  DOWNLOAD_SHEET_NOT_SIGNED: 'Завантаження доступне лише після повного підписання листка.',
  DOWNLOAD_SHEET_NOT_READY: 'Завантаження стане доступним після прийняття голосу.',
  DOWNLOAD_PDF_NOT_AVAILABLE: 'PDF ще недоступний.',
  DOWNLOAD_SIGNED_NOT_AVAILABLE: 'Підписаний контейнер ще недоступний.',
  DOWNLOAD_PROVIDER_FILE_NOT_AVAILABLE: 'Файли підписання ще недоступні. Спробуйте трохи пізніше.',
  DOWNLOAD_PREPARE_FAILED: 'Не вдалося підготувати файл для завантаження.',
};

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] ?? null;
}

export function DownloadActionButton({
  href,
  label,
  pendingLabel = 'Завантаження...',
  variant = 'outline',
  className,
  icon,
  disabled = false,
  onDownloadStart,
}: DownloadActionButtonProps) {
  const downloadLockRef = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (disabled || isPending || downloadLockRef.current) {
      return;
    }

    downloadLockRef.current = true;
    setError(null);
    setIsPending(true);
    onDownloadStart?.();

    try {
      const response = await fetch(href, { method: 'GET' });
      if (!response.ok) {
        const payload = await readJsonBody(response);
        const message = resolveApiErrorMessage(payload, {
          codeMap: DOWNLOAD_ERROR_MAP,
          fallbackMessage: UNKNOWN_DOWNLOAD_ERROR_MESSAGE,
        });
        setError(message);
        toast.error(message);
        return;
      }

      const blob = await response.blob();
      const filename =
        parseFilename(response.headers.get('content-disposition')) ?? `download-${Date.now()}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success('Файл успішно завантажено.');
    } catch {
      const message = UNKNOWN_DOWNLOAD_ERROR_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      downloadLockRef.current = false;
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={handleDownload}
        disabled={disabled || isPending}
        aria-busy={isPending}
      >
        {isPending ? <LoadingSpinner className="h-4 w-4" /> : icon}
        {isPending ? pendingLabel : label}
      </Button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
