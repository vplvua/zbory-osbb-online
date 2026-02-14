'use client';

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type DownloadActionButtonProps = {
  href: string;
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
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

    try {
      const response = await fetch(href, { method: 'GET' });
      if (!response.ok) {
        throw new Error('DOWNLOAD_FAILED');
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
    } catch {
      setError('Не вдалося завантажити файл. Спробуйте ще раз.');
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
