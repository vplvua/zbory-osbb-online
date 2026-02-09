'use client';

import { useActionState } from 'react';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ProtocolOwnerFormState } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

const initialState: ProtocolOwnerFormState = {};

type AvailableOwner = {
  id: string;
  shortName: string;
  apartmentNumber: string;
};

type OwnerAttachFormProps = {
  protocolId: string;
  owners: AvailableOwner[];
  action: (state: ProtocolOwnerFormState, formData: FormData) => Promise<ProtocolOwnerFormState>;
};

export default function OwnerAttachForm({ protocolId, owners, action }: OwnerAttachFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="protocolId" value={protocolId} />

      <div className="space-y-2">
        <Label htmlFor="ownerId">Обрати співвласника з реєстру ОСББ</Label>
        <select
          id="ownerId"
          name="ownerId"
          defaultValue={owners[0]?.id ?? ''}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          required
        >
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.shortName} (кв. {owner.apartmentNumber})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary">
          <AddIcon className="h-4 w-4" />
          Додати до протоколу
        </Button>
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
    </form>
  );
}
