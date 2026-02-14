'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { ErrorAlert } from '@/components/ui/error-alert';
import type { OsbbFormState } from '@/app/osbb/actions';

const initialState: OsbbFormState = {};

type OsbbDeleteFormProps = {
  action: (state: OsbbFormState, formData: FormData) => Promise<OsbbFormState>;
  id: string;
};

export default function OsbbDeleteForm({ action, id }: OsbbDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        confirmMessage="Ви впевнені, що хочете видалити це ОСББ?"
      >
        Видалити ОСББ
      </ConfirmSubmitButton>
    </form>
  );
}
