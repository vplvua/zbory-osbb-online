'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';

const initialState: ProtocolFormState = {};

type ProtocolFormProps = {
  action: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  defaultValues?: {
    protocolId?: string;
    osbbId?: string;
    number?: string;
    date?: string;
    type?: 'ESTABLISHMENT' | 'GENERAL';
  };
  submitLabel: string;
};

export default function ProtocolForm({ action, defaultValues, submitLabel }: ProtocolFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дані протоколу</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {defaultValues?.protocolId ? (
            <input type="hidden" name="protocolId" value={defaultValues.protocolId} />
          ) : null}
          {defaultValues?.osbbId ? (
            <input type="hidden" name="osbbId" value={defaultValues.osbbId} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="number">Номер протоколу</Label>
            <Input id="number" name="number" defaultValue={defaultValues?.number ?? ''} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Дата зборів</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultValues?.date ?? ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Тип зборів</Label>
            <select
              id="type"
              name="type"
              defaultValue={defaultValues?.type ?? 'GENERAL'}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              required
            >
              <option value="GENERAL">Загальні</option>
              <option value="ESTABLISHMENT">Установчі</option>
            </select>
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <Button type="submit">{submitLabel}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
