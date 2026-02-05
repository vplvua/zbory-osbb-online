'use client';

import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { OsbbFormState } from '@/app/osbb/actions';

const initialState: OsbbFormState = {};

type OsbbDeleteFormProps = {
  action: (state: OsbbFormState, formData: FormData) => Promise<OsbbFormState>;
  id: string;
};

export default function OsbbDeleteForm({ action, id }: OsbbDeleteFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" variant="destructive">
        Видалити ОСББ
      </Button>
    </form>
  );
}
