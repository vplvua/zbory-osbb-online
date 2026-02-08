'use client';

import { useActionState } from 'react';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import type { OwnerFormState } from '@/app/owners/actions';

const initialState: OwnerFormState = {};

type OwnerFormProps = {
  action: (state: OwnerFormState, formData: FormData) => Promise<OwnerFormState>;
  defaultValues?: {
    ownerId?: string;
    fullName?: string;
    apartmentNumber?: string;
    totalArea?: string;
    ownershipNumerator?: string;
    ownershipDenominator?: string;
    ownershipDocument?: string;
    email?: string;
    phone?: string;
    representativeName?: string;
    representativeDocument?: string;
  };
  submitLabel: string;
};

export default function OwnerForm({ action, defaultValues, submitLabel }: OwnerFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дані співвласника</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {defaultValues?.ownerId ? (
            <input type="hidden" name="ownerId" value={defaultValues.ownerId} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="fullName">ПІБ</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={defaultValues?.fullName ?? ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apartmentNumber">Номер квартири/приміщення</Label>
            <Input
              id="apartmentNumber"
              name="apartmentNumber"
              defaultValue={defaultValues?.apartmentNumber ?? ''}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="totalArea">Загальна площа</Label>
              <Input
                id="totalArea"
                name="totalArea"
                type="number"
                min="0"
                step="0.01"
                defaultValue={defaultValues?.totalArea ?? ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownershipNumerator">Чисельник</Label>
              <Input
                id="ownershipNumerator"
                name="ownershipNumerator"
                type="number"
                min="1"
                step="1"
                defaultValue={defaultValues?.ownershipNumerator ?? ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownershipDenominator">Знаменник</Label>
              <Input
                id="ownershipDenominator"
                name="ownershipDenominator"
                type="number"
                min="1"
                step="1"
                defaultValue={defaultValues?.ownershipDenominator ?? ''}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownershipDocument">Документ права власності</Label>
            <Textarea
              id="ownershipDocument"
              name="ownershipDocument"
              defaultValue={defaultValues?.ownershipDocument ?? ''}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={defaultValues?.email ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <PhoneInput id="phone" name="phone" defaultValue={defaultValues?.phone ?? ''} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="representativeName">Представник (ПІБ)</Label>
            <Input
              id="representativeName"
              name="representativeName"
              defaultValue={defaultValues?.representativeName ?? ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="representativeDocument">Документ повноважень</Label>
            <Textarea
              id="representativeDocument"
              name="representativeDocument"
              defaultValue={defaultValues?.representativeDocument ?? ''}
            />
          </div>

          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

          <Button type="submit">
            {submitLabel.startsWith('Додати') ? <AddIcon className="h-4 w-4" /> : null}
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
