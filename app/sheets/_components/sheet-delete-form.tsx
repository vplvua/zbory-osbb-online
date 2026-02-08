'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import type { SheetFormState } from '@/app/sheets/actions';

const initialState: SheetFormState = {};

type SheetDeleteFormProps = {
  sheetId: string;
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
};

export default function SheetDeleteForm({ sheetId, action }: SheetDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="sheetId" value={sheetId} />
      {state.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        className="h-8 px-3 text-xs"
        confirmMessage="Ви впевнені, що хочете видалити цей листок опитування?"
      >
        Видалити
      </ConfirmSubmitButton>
    </form>
  );
}
