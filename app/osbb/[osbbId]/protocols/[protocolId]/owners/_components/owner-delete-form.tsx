'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import type { OwnerFormState } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

const initialState: OwnerFormState = {};

type OwnerDeleteFormProps = {
  ownerId: string;
  protocolId: string;
  action: (state: OwnerFormState, formData: FormData) => Promise<OwnerFormState>;
};

export default function OwnerDeleteForm({ ownerId, protocolId, action }: OwnerDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ownerId" value={ownerId} />
      <input type="hidden" name="protocolId" value={protocolId} />
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        confirmMessage="Ви впевнені, що хочете видалити цього співвласника з поточного протоколу?"
      >
        Видалити з протоколу
      </ConfirmSubmitButton>
    </form>
  );
}
