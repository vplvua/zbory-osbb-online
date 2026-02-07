'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { SheetFormState } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

const initialState: SheetFormState = {};

type SheetRetryFormProps = {
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
  sheetId: string;
};

export default function SheetRetryForm({ action, sheetId }: SheetRetryFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="sheetId" value={sheetId} />
      <Button type="submit" variant="outline" className="h-8 px-2 text-xs">
        Повторити генерацію PDF
      </Button>
      {state.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </form>
  );
}
