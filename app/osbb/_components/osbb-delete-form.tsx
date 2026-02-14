'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { OsbbFormState } from '@/app/osbb/actions';

const initialState: OsbbFormState = {};

type OsbbDeleteFormProps = {
  action: (state: OsbbFormState, formData: FormData) => Promise<OsbbFormState>;
  id: string;
};

export default function OsbbDeleteForm({ action, id }: OsbbDeleteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2" data-submitting={isPending ? 'true' : 'false'}>
      <input type="hidden" name="id" value={id} />
      {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        confirmMessage="Ви впевнені, що хочете видалити це ОСББ?"
        pendingLabel="Видалення..."
        disabled={isPending}
      >
        {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
        {isPending ? 'Видалення...' : 'Видалити ОСББ'}
      </ConfirmSubmitButton>
    </form>
  );
}
