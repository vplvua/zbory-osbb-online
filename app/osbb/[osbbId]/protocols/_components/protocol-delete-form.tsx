'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
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
      <Button type="submit" variant="destructive">
        Видалити протокол
      </Button>
    </form>
  );
}
