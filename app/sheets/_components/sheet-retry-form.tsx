'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { SheetFormState } from '@/app/sheets/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';

const initialState: SheetFormState = {};

type SheetRetryFormProps = {
  sheetId: string;
  redirectTo?: string;
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
};

export default function SheetRetryForm({ sheetId, redirectTo, action }: SheetRetryFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionErrorToast(state.error);

  return (
    <form action={formAction} className="space-y-1" data-submitting={isPending ? 'true' : 'false'}>
      <input type="hidden" name="sheetId" value={sheetId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      {state.error ? <ErrorAlert size="compact">{state.error}</ErrorAlert> : null}
      <Button type="submit" variant="outline" className="h-8 px-3 text-xs" disabled={isPending}>
        {isPending ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
        {isPending ? 'Запускаємо...' : 'Повторити PDF'}
      </Button>
    </form>
  );
}
