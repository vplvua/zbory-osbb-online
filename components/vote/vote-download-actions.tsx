'use client';

import { DownloadActionButton } from '@/components/ui/download-action-button';

type VoteDownloadActionsProps = {
  baseDownloadPath: string;
  hasPdfFile: boolean;
};

export default function VoteDownloadActions({
  baseDownloadPath,
  hasPdfFile,
}: VoteDownloadActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {hasPdfFile ? (
        <>
          <DownloadActionButton
            href={`${baseDownloadPath}/original`}
            label="Завантажити оригінальний PDF"
            pendingLabel="Завантаження PDF..."
          />
          <DownloadActionButton
            href={`${baseDownloadPath}/visualization`}
            label="Завантажити PDF візуалізації"
            pendingLabel="Завантаження PDF..."
          />
        </>
      ) : (
        <span className="text-muted-foreground inline-flex h-10 items-center text-sm">
          Оригінальний PDF ще недоступний
        </span>
      )}
      <DownloadActionButton
        href={`${baseDownloadPath}/signed`}
        label="Завантажити підписаний .p7s"
        pendingLabel="Завантаження .p7s..."
      />
    </div>
  );
}
