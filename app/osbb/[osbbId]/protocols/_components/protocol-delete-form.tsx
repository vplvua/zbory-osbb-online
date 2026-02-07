'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';

const initialState: ProtocolFormState = {};

type ProtocolDeleteFormProps = {
  protocolId: string;
  action: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
};

export default function DeleteProtocolForm({ protocolId, action }: ProtocolDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="protocolId" value={protocolId} />
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      <ConfirmSubmitButton
        type="submit"
        variant="destructive"
        confirmMessage="Ви впевнені, що хочете видалити цей протокол?"
      >
        Видалити протокол
      </ConfirmSubmitButton>
    </form>
  );
}
