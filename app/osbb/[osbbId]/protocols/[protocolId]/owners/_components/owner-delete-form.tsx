'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { OwnerFormState } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

const initialState: OwnerFormState = {};

type OwnerDeleteFormProps = {
  ownerId: string;
  action: (state: OwnerFormState, formData: FormData) => Promise<OwnerFormState>;
};

export default function OwnerDeleteForm({ ownerId, action }: OwnerDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ownerId" value={ownerId} />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" variant="destructive">
        Видалити співвласника
      </Button>
    </form>
  );
}
