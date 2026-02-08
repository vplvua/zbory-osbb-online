'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import type { OsbbFormState } from '@/app/osbb/actions';

const initialState: OsbbFormState = {};

type OsbbFormProps = {
  action: (state: OsbbFormState, formData: FormData) => Promise<OsbbFormState>;
  formId?: string;
  showSubmitButton?: boolean;
  defaultValues?: {
    id?: string;
    name?: string;
    shortName?: string;
    address?: string;
    edrpou?: string;
    organizerName?: string;
    organizerEmail?: string;
    organizerPhone?: string;
  };
  submitLabel: string;
};

export default function OsbbForm({
  action,
  formId,
  showSubmitButton = true,
  defaultValues,
  submitLabel,
}: OsbbFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Реквізити ОСББ</CardTitle>
      </CardHeader>
      <CardContent>
        <form id={formId} action={formAction} className="space-y-4">
          {defaultValues?.id ? <input type="hidden" name="id" value={defaultValues.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="name">Повна назва</Label>
            <Input id="name" name="name" defaultValue={defaultValues?.name ?? ''} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortName">Коротка назва</Label>
            <Input
              id="shortName"
              name="shortName"
              defaultValue={defaultValues?.shortName ?? ''}
              required
            />
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

          <div className="space-y-4 pt-2">
            <h3 className="text-base font-semibold">Особа, яка проводить опитування</h3>

            <div className="space-y-2">
              <Label htmlFor="organizerName">ПІБ</Label>
              <Input
                id="organizerName"
                name="organizerName"
                defaultValue={defaultValues?.organizerName ?? ''}
                required
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="organizerEmail">Електронна адреса</Label>
              <Input
                id="organizerEmail"
                name="organizerEmail"
                type="email"
                defaultValue={defaultValues?.organizerEmail ?? ''}
                required
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="organizerPhone">Номер телефону</Label>
              <PhoneInput
                id="organizerPhone"
                name="organizerPhone"
                defaultValue={defaultValues?.organizerPhone ?? ''}
                required
              />
            </div>
          </div>

          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

          {showSubmitButton ? <Button type="submit">{submitLabel}</Button> : null}
        </form>
      </CardContent>
    </Card>
  );
}
