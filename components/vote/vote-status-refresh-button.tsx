'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { readJsonBody, resolveApiErrorMessage, type ApiErrorCodeMap } from '@/lib/api/client-error';
import { isApiOkDto } from '@/lib/api/error-dto';
import { toast } from '@/lib/toast/client';

type VoteStatusRefreshButtonProps = {
  token: string;
  className?: string;
};

type VoteStatusRefreshSuccess = {
  ok: true;
  changed: boolean;
  message?: string;
};

const STATUS_REFRESH_ERROR_MAP: ApiErrorCodeMap = {
  VOTE_SHEET_NOT_FOUND: 'Листок не знайдено.',
  VOTE_EXPIRED: 'Термін голосування завершено.',
  VOTE_STATUS_REFRESH_UNAVAILABLE: 'Оновлення статусу зараз недоступне.',
  VOTE_SIGNING_NOT_STARTED: 'Підписання ще не запущено. Спочатку надішліть голос.',
  VOTE_SIGNING_UNAVAILABLE: 'Сервіс підписання тимчасово недоступний. Спробуйте ще раз.',
  VOTE_REFRESH_FAILED: 'Не вдалося оновити дані листка. Спробуйте ще раз.',
};

export default function VoteStatusRefreshButton({
  token,
  className,
}: VoteStatusRefreshButtonProps) {
  const router = useRouter();
  const lockRef = useRef(false);
  const [isPending, setIsPending] = useState(false);

  const handleRefreshStatus = async () => {
    if (lockRef.current || isPending) {
      return;
    }

    lockRef.current = true;
    setIsPending(true);

    try {
      const response = await fetch(`/api/vote/${encodeURIComponent(token)}/status-refresh`, {
        method: 'POST',
      });

      const payload = await readJsonBody(response);
      if (!response.ok || !isApiOkDto(payload)) {
        const message = resolveApiErrorMessage(payload, {
          codeMap: STATUS_REFRESH_ERROR_MAP,
          fallbackMessage: 'Не вдалося оновити статус документа. Спробуйте ще раз.',
        });
        toast.error(message);
        return;
      }

      const result = payload as VoteStatusRefreshSuccess;
      const message = result.message?.trim() || 'Статус документа оновлено.';

      if (result.changed) {
        toast.success(message);
      } else {
        toast.info(message);
      }

      router.refresh();
    } catch {
      toast.error('Не вдалося оновити статус документа. Спробуйте ще раз.');
    } finally {
      lockRef.current = false;
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={handleRefreshStatus}
      disabled={isPending}
    >
      {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
      {isPending ? 'Оновлюємо...' : 'Оновити статус документа'}
    </Button>
  );
}
