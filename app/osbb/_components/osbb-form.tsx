'use client';

import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OsbbFormState } from '@/app/osbb/actions';

const initialState: OsbbFormState = {};

type OsbbFormProps = {
  action: (state: OsbbFormState, formData: FormData) => Promise<OsbbFormState>;
  defaultValues?: {
    id?: string;
    name?: string;
    address?: string;
    edrpou?: string;
  };
  submitLabel: string;
};

export default function OsbbForm({ action, defaultValues, submitLabel }: OsbbFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дані ОСББ</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {defaultValues?.id ? <input type="hidden" name="id" value={defaultValues.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="name">Назва</Label>
            <Input id="name" name="name" defaultValue={defaultValues?.name ?? ''} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адреса</Label>
            <Input
              id="address"
              name="address"
              defaultValue={defaultValues?.address ?? ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edrpou">ЄДРПОУ</Label>
            <Input
              id="edrpou"
              name="edrpou"
              defaultValue={defaultValues?.edrpou ?? ''}
              required
              inputMode="numeric"
            />
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <Button type="submit">{submitLabel}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
