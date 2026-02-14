'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import type { SheetFormState } from '@/app/sheets/actions';

const initialState: SheetFormState = {};

type SheetRetryFormProps = {
  sheetId: string;
  redirectTo?: string;
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
};

export default function SheetRetryForm({ sheetId, redirectTo, action }: SheetRetryFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="sheetId" value={sheetId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      {state.error ? <ErrorAlert size="compact">{state.error}</ErrorAlert> : null}
      <Button type="submit" variant="outline" className="h-8 px-3 text-xs">
        Повторити PDF
      </Button>
    </form>
  );
}
