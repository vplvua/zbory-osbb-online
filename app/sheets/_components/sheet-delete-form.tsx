'use client';

import type { SVGProps } from 'react';
import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { ErrorAlert } from '@/components/ui/error-alert';
import type { SheetFormState } from '@/app/sheets/actions';

const initialState: SheetFormState = {};

type SheetDeleteFormProps = {
  sheetId: string;
  redirectTo?: string;
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
};

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function SheetDeleteForm({ sheetId, redirectTo, action }: SheetDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="sheetId" value={sheetId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      {state.error ? <ErrorAlert size="compact">{state.error}</ErrorAlert> : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        className="h-8 px-3 text-xs"
        confirmMessage="Ви впевнені, що хочете видалити цей листок опитування?"
      >
        <TrashIcon className="h-4 w-4" />
        Видалити
      </ConfirmSubmitButton>
    </form>
  );
}
