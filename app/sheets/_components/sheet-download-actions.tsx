'use client';

import { DownloadActionButton } from '@/components/ui/download-action-button';

type SheetDownloadActionsProps = {
  downloadBasePath: string;
  hasPdf: boolean;
  isSigned: boolean;
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

function PdfVisualIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 14.5c.8-1.1 2.1-2 4-2s3.2.9 4 2c-.8 1.1-2.1 2-4 2s-3.2-.9-4-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

export default function SheetDownloadActions({
  downloadBasePath,
  hasPdf,
  isSigned,
}: SheetDownloadActionsProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {hasPdf ? (
        <>
          <DownloadActionButton
            href={`${downloadBasePath}/original`}
            label="Оригінал PDF"
            pendingLabel="Завантаження..."
            className="h-8 gap-1.5 px-3 text-xs font-semibold"
            icon={<PdfFileIcon className="h-4 w-4" />}
          />
          <DownloadActionButton
            href={`${downloadBasePath}/visualization`}
            label="Візуалізація PDF"
            pendingLabel="Завантаження..."
            className="h-8 gap-1.5 px-3 text-xs font-semibold"
            icon={<PdfVisualIcon className="h-4 w-4" />}
          />
        </>
      ) : (
        <span className="text-muted-foreground text-xs">PDF недоступний</span>
      )}
      {isSigned ? (
        <DownloadActionButton
          href={`${downloadBasePath}/signed`}
          label="Підписаний .p7s"
          pendingLabel="Завантаження..."
          variant="ghost"
          className="text-brand h-8 px-2 text-xs underline-offset-4 hover:underline"
        />
      ) : null}
    </div>
  );
}
