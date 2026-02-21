'use client';

import { useActionState, useEffect, useRef } from 'react';
import RefreshIcon from '@/components/icons/refresh-icon';
import SignatureIcon from '@/components/icons/signature-icon';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { SheetFormState } from '@/app/sheets/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';

const initialState: SheetFormState = {};

type SheetOrganizerSignActionsProps = {
  sheetId: string;
  redirectTo?: string;
  disabled?: boolean;
  signAction: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
  refreshAction: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
};

export default function SheetOrganizerSignActions({
  sheetId,
  redirectTo,
  disabled = false,
  signAction,
  refreshAction,
}: SheetOrganizerSignActionsProps) {
  const [signState, signFormAction, signPending] = useActionState(signAction, initialState);
  const [refreshState, refreshFormAction, refreshPending] = useActionState(
    refreshAction,
    initialState,
  );
  const pendingSignWindowRef = useRef<Window | null>(null);

  const isPending = signPending || refreshPending;
  const error = signState.error ?? refreshState.error;
  useActionErrorToast(error);

  useEffect(() => {
    if (signPending) {
      return;
    }

    const pendingWindow = pendingSignWindowRef.current;
    if (signState.signingUrl) {
      if (pendingWindow && !pendingWindow.closed) {
        pendingWindow.location.href = signState.signingUrl;
      } else {
        window.open(signState.signingUrl, '_blank', 'noopener,noreferrer');
      }
      pendingSignWindowRef.current = null;
      return;
    }

    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.close();
    }
    pendingSignWindowRef.current = null;
  }, [signPending, signState.signingUrl]);

  return (
    <div className="space-y-2">
      {error ? <ErrorAlert size="compact">{error}</ErrorAlert> : null}
      <div className="flex flex-wrap gap-2">
        <form action={signFormAction} data-submitting={signPending ? 'true' : 'false'}>
          <input type="hidden" name="sheetId" value={sheetId} />
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
          <Button
            type="submit"
            className="h-8 px-3 text-xs"
            disabled={disabled || isPending}
            onClick={() => {
              const nextWindow = window.open('', '_blank');
              if (nextWindow) {
                nextWindow.opener = null;
              }
              pendingSignWindowRef.current = nextWindow;
            }}
          >
            {signPending ? (
              <LoadingSpinner className="h-3.5 w-3.5" />
            ) : (
              <SignatureIcon className="h-3.5 w-3.5" />
            )}
            {signPending ? 'Готуємо підпис...' : 'Підписати'}
          </Button>
        </form>

        <form action={refreshFormAction} data-submitting={refreshPending ? 'true' : 'false'}>
          <input type="hidden" name="sheetId" value={sheetId} />
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
          <Button
            type="submit"
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={disabled || isPending}
          >
            {refreshPending ? (
              <LoadingSpinner className="h-3.5 w-3.5" />
            ) : (
              <RefreshIcon className="h-3.5 w-3.5" />
            )}
            {refreshPending ? 'Оновлюємо...' : 'Оновити статус'}
          </Button>
        </form>
      </div>
    </div>
  );
}
