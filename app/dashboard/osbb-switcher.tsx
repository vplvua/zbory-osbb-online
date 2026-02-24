'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { selectOsbbAction } from '@/app/dashboard/actions';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import type { OsbbSummary } from '@/lib/osbb/selected-osbb';

type OsbbSwitcherProps = {
  osbbs: OsbbSummary[];
  selectedOsbbId: string | null;
  requireSelection: boolean;
};

export default function OsbbSwitcher({
  osbbs,
  selectedOsbbId,
  requireSelection,
}: OsbbSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [pendingOsbbId, setPendingOsbbId] = useState<string | null>(null);
  const isOpen = requireSelection || open;
  const isSwitching = pendingOsbbId !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !requireSelection && !isSwitching) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSwitching, requireSelection]);

  const title = useMemo(
    () => (requireSelection ? 'Оберіть ОСББ для роботи' : 'Змінити ОСББ'),
    [requireSelection],
  );

  const closeModal = () => {
    if (requireSelection || isSwitching) {
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="shrink-0 whitespace-nowrap"
        disabled={isSwitching}
        onClick={() => setOpen(true)}
      >
        Змінити ОСББ
      </Button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Закрити вибір ОСББ"
                className="absolute inset-0 bg-black/45"
                onClick={closeModal}
              />

              <div
                className="border-border bg-surface relative z-10 w-full max-w-2xl rounded-xl border p-5 shadow-md"
                aria-busy={isSwitching}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Усі дії в додатку будуть виконуватися в контексті обраного ОСББ.
                    </p>
                  </div>
                  {!requireSelection ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeModal}
                      disabled={isSwitching}
                    >
                      Закрити
                    </Button>
                  ) : null}
                </div>

                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {osbbs.map((osbb) => (
                    <form
                      key={osbb.id}
                      action={selectOsbbAction}
                      onSubmit={() => setPendingOsbbId(osbb.id)}
                      data-submitting={pendingOsbbId === osbb.id ? 'true' : 'false'}
                    >
                      <input type="hidden" name="osbbId" value={osbb.id} />
                      <button
                        type="submit"
                        disabled={isSwitching}
                        aria-busy={pendingOsbbId === osbb.id}
                        className={cn(
                          'border-border w-full rounded-lg border p-4 text-left transition',
                          !isSwitching && 'hover:bg-surface-muted',
                          isSwitching && 'cursor-wait opacity-70',
                          selectedOsbbId === osbb.id && 'border-brand bg-surface-muted border-2',
                        )}
                      >
                        <p className="text-base font-semibold">{osbb.shortName}</p>
                        <p className="text-muted-foreground mt-1 text-sm">{osbb.address}</p>
                        {pendingOsbbId === osbb.id ? (
                          <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                            <LoadingSpinner className="h-3.5 w-3.5" />
                            Перемикаємо...
                          </p>
                        ) : null}
                      </button>
                    </form>
                  ))}
                </div>

                <div className="mt-5 flex justify-end">
                  <Link href="/osbb/new">
                    <Button type="button" disabled={isSwitching}>
                      <AddIcon className="h-4 w-4" />
                      Додати ОСББ
                    </Button>
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
