'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { selectOsbbAction } from '@/app/dashboard/actions';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
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
  const isOpen = requireSelection || open;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !requireSelection) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, requireSelection]);

  const title = useMemo(
    () => (requireSelection ? 'Оберіть ОСББ для роботи' : 'Змінити ОСББ'),
    [requireSelection],
  );

  const closeModal = () => {
    if (requireSelection) {
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

              <div className="border-border bg-surface relative z-10 w-full max-w-2xl rounded-xl border p-5 shadow-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Усі дії в додатку будуть виконуватися в контексті обраного ОСББ.
                    </p>
                  </div>
                  {!requireSelection ? (
                    <Button type="button" variant="ghost" onClick={closeModal}>
                      Закрити
                    </Button>
                  ) : null}
                </div>

                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {osbbs.map((osbb) => (
                    <form key={osbb.id} action={selectOsbbAction}>
                      <input type="hidden" name="osbbId" value={osbb.id} />
                      <button
                        type="submit"
                        className={`border-border hover:bg-surface-muted w-full rounded-lg border p-4 text-left transition ${selectedOsbbId === osbb.id ? 'border-brand bg-surface-muted border-2' : ''}`}
                      >
                        <p className="text-base font-semibold">{osbb.shortName}</p>
                        <p className="text-muted-foreground mt-1 text-sm">{osbb.address}</p>
                      </button>
                    </form>
                  ))}
                </div>

                <div className="mt-5 flex justify-end">
                  <Link href="/osbb/new">
                    <Button type="button">
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
