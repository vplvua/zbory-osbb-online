'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type DubidocSigningWidgetProps = {
  signingUrl: string;
  onClose: () => void;
};

export default function DubidocSigningWidget({ signingUrl, onClose }: DubidocSigningWidgetProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleDone = useCallback(() => {
    onClose();
    router.refresh();
  }, [onClose, router]);

  return (
    <div className="border-border bg-surface rounded-lg border">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-semibold">Підписання документа</h2>
        <Button type="button" variant="outline" onClick={handleDone}>
          Закрити
        </Button>
      </div>

      <div className="relative">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner className="h-6 w-6" />
              <p className="text-muted-foreground text-sm">Завантажуємо форму підпису...</p>
            </div>
          </div>
        ) : null}

        <iframe
          src={signingUrl}
          title="Dubidoc — підписання документа"
          className="h-[70vh] w-full border-0"
          allow="clipboard-write"
          onLoad={handleIframeLoad}
        />
      </div>

      <div className="border-border border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">
          Після підписання натисніть «Закрити», щоб повернутися до листка.
        </p>
      </div>
    </div>
  );
}
