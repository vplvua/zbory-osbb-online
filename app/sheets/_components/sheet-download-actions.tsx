'use client';

import { type ReactNode, type SVGProps, useEffect, useId, useMemo, useState } from 'react';
import DownloadIcon from '@/components/icons/download-icon';
import { Button } from '@/components/ui/button';
import { DownloadActionButton } from '@/components/ui/download-action-button';

type SheetDownloadActionsProps = {
  downloadBasePath: string;
  hasPdf: boolean;
  hasDubidocDocument: boolean;
  isSigned: boolean;
};

type DownloadOption = {
  id: string;
  href: string;
  title: string;
  description: string;
  pendingLabel: string;
  icon: ReactNode;
};

function PdfFileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 15h8M8 18h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SignedFileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="8.5" cy="10.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 10.5h9l-2 2 1.5 1.5-1.5 1.5-1.5-1.5-1.5 1.5h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M7 14h10v6H7z" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function SheetDownloadActions({
  downloadBasePath,
  hasPdf,
  hasDubidocDocument,
  isSigned,
}: SheetDownloadActionsProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const canDownloadOriginal = hasPdf || hasDubidocDocument;
  const canDownloadDubidocVariants = hasDubidocDocument || isSigned;
  const hasAvailableDownloads = canDownloadOriginal || canDownloadDubidocVariants;

  const downloadOptions = useMemo<DownloadOption[]>(() => {
    const options: DownloadOption[] = [];
    if (canDownloadOriginal) {
      options.push({
        id: 'original',
        href: `${downloadBasePath}/original`,
        title: 'Оригінальний документ',
        description: 'У початковому вигляді без змін та підписів',
        pendingLabel: 'Завантаження PDF...',
        icon: <PdfFileIcon className="h-5 w-5" />,
      });
    }

    if (canDownloadDubidocVariants) {
      options.push({
        id: 'signed',
        href: `${downloadBasePath}/signed`,
        title: 'Підписаний документ',
        description: 'З електронним підписом у форматі .p7s',
        pendingLabel: 'Завантаження .p7s...',
        icon: <SignedFileIcon className="h-5 w-5" />,
      });
      options.push({
        id: 'printable',
        href: `${downloadBasePath}/printable`,
        title: 'Версію для друку',
        description: 'Документ з протоколом підписання',
        pendingLabel: 'Завантаження PDF...',
        icon: <PrintIcon className="h-5 w-5" />,
      });
    }

    return options;
  }, [canDownloadDubidocVariants, canDownloadOriginal, downloadBasePath]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 text-xs font-semibold"
        onClick={() => {
          setOpen(true);
        }}
        disabled={!hasAvailableDownloads}
      >
        <DownloadIcon className="h-4 w-4" />
        Завантажити файли
      </Button>
      {!hasAvailableDownloads ? (
        <p className="text-muted-foreground text-xs">Файли недоступні</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрити модальне вікно"
            className="absolute inset-0 bg-black/45"
            onClick={() => {
              setOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="border-border bg-surface relative z-10 w-full max-w-2xl rounded-xl border p-5 shadow-md sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id={titleId} className="text-xl font-semibold sm:text-2xl">
                Завантажити
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                onClick={() => {
                  setOpen(false);
                }}
                aria-label="Закрити"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {downloadOptions.map((option) => (
                <DownloadActionButton
                  key={option.id}
                  href={option.href}
                  onDownloadStart={() => {
                    setOpen(false);
                  }}
                  pendingLabel={option.pendingLabel}
                  variant="ghost"
                  className="border-border bg-surface-muted hover:bg-surface hover:border-border/80 h-auto w-full flex-row-reverse justify-between rounded-lg border px-4 py-3 transition-[background-color,box-shadow,border-color] duration-150 hover:shadow-sm"
                  icon={option.icon}
                  label={
                    <span className="mr-3 flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
                      <span className="text-foreground text-base leading-tight font-semibold">
                        {option.title}
                      </span>
                      <span className="text-muted-foreground text-sm leading-snug font-normal">
                        {option.description}
                      </span>
                    </span>
                  }
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
