'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SheetFormState } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

const initialState: SheetFormState = {};

type SheetCreateFormProps = {
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
  protocolId: string;
  ownerId: string;
  defaultSurveyDate: string;
};

export default function SheetCreateForm({
  action,
  protocolId,
  ownerId,
  defaultSurveyDate,
}: SheetCreateFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="protocolId" value={protocolId} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Input
          type="date"
          name="surveyDate"
          defaultValue={defaultSurveyDate}
          className="h-9 w-40 text-xs"
          required
        />
        <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
          Створити листок
        </Button>
      </div>
      {state.error ? <p className="text-right text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
