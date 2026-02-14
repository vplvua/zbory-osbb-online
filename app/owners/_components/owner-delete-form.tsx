'use client';

import { type SVGProps, useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { OwnerFormState } from '@/app/owners/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';

const initialState: OwnerFormState = {};

type OwnerDeleteFormProps = {
  ownerId: string;
  action: (state: OwnerFormState, formData: FormData) => Promise<OwnerFormState>;
};

function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v6" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export default function OwnerDeleteForm({ ownerId, action }: OwnerDeleteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionErrorToast(state.error);

  return (
    <form action={formAction} className="space-y-2" data-submitting={isPending ? 'true' : 'false'}>
      <input type="hidden" name="ownerId" value={ownerId} />
      {state.error ? (
        <section className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{state.error}</p>
        </section>
      ) : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        confirmMessage="Ви впевнені, що хочете видалити цього співвласника?"
        pendingLabel="Видалення..."
        disabled={isPending}
      >
        {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
        {isPending ? 'Видалення...' : 'Видалити співвласника'}
      </ConfirmSubmitButton>
    </form>
  );
}
