'use client';

import { useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';

type ButtonVariant = 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  showCancel?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Видалити',
  cancelLabel = 'Скасувати',
  confirmVariant = 'destructive',
  showCancel = true,
  confirmDisabled = false,
  cancelDisabled = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Закрити модальне вікно"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="border-border bg-surface relative z-10 w-full max-w-md rounded-lg border p-5 shadow-md"
      >
        <h3 id={titleId} className="text-lg font-semibold">
          {title}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          {showCancel ? (
            <Button type="button" variant="outline" onClick={onClose} disabled={cancelDisabled}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            autoFocus
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
