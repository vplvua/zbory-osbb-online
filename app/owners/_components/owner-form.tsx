'use client';

import { type ChangeEvent, useActionState, useState } from 'react';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import type { OwnerFormState } from '@/app/owners/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';

const initialState: OwnerFormState = {};
type OwnershipMode = 'single' | 'fraction';

function normalizeOwnershipPart(value?: string) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return '1';
  }

  return String(Math.min(parsed, 100));
}

type OwnerFormProps = {
  action: (state: OwnerFormState, formData: FormData) => Promise<OwnerFormState>;
  defaultValues?: {
    ownerId?: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
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
  formId?: string;
  showSubmitButton?: boolean;
  isDisabled?: boolean;
};

export default function OwnerForm({
  action,
  defaultValues,
  submitLabel,
  formId,
  showSubmitButton = true,
  isDisabled = false,
}: OwnerFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionErrorToast(state.error);
  const [ownershipMode, setOwnershipMode] = useState<OwnershipMode>(() => {
    const numerator = Number.parseInt(defaultValues?.ownershipNumerator ?? '1', 10);
    const denominator = Number.parseInt(defaultValues?.ownershipDenominator ?? '1', 10);
    return numerator === 1 && denominator === 1 ? 'single' : 'fraction';
  });
  const isFractionOwnership = ownershipMode === 'fraction';
  const [ownershipNumerator, setOwnershipNumerator] = useState(() =>
    normalizeOwnershipPart(defaultValues?.ownershipNumerator),
  );
  const [ownershipDenominator, setOwnershipDenominator] = useState(() =>
    normalizeOwnershipPart(defaultValues?.ownershipDenominator),
  );

  const handleOwnershipPartChange =
    (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.currentTarget.value;
      if (!rawValue) {
        setter('');
        return;
      }

      const parsed = Number.parseInt(rawValue, 10);
      if (Number.isNaN(parsed)) {
        setter('');
        return;
      }

      const clamped = Math.min(100, Math.max(1, parsed));
      setter(String(clamped));
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Реквізити співвласника</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id={formId}
          action={formAction}
          className="space-y-4"
          data-submitting={isPending ? 'true' : 'false'}
        >
          <fieldset disabled={isDisabled || isPending} className="space-y-4">
            {defaultValues?.ownerId ? (
              <input type="hidden" name="ownerId" value={defaultValues.ownerId} />
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lastName">Прізвище</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={defaultValues?.lastName ?? ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Ім&apos;я</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={defaultValues?.firstName ?? ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">По батькові</Label>
                <Input
                  id="middleName"
                  name="middleName"
                  defaultValue={defaultValues?.middleName ?? ''}
                  required
                />
              </div>
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

            <div className="grid gap-4 md:grid-cols-2">
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

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isFractionOwnership}
                      onChange={(event) =>
                        setOwnershipMode(event.currentTarget.checked ? 'fraction' : 'single')
                      }
                    />
                    <span className="bg-muted border-border peer-checked:bg-brand absolute inset-0 rounded-full border transition-colors peer-checked:border-transparent" />
                    <span className="bg-background absolute top-1/2 left-1 h-4 w-4 -translate-y-1/2 rounded-full transition-transform peer-checked:translate-x-5" />
                  </label>
                  <span className="text-sm font-medium">
                    {isFractionOwnership ? 'Володіє часткою' : 'Один власник'}
                  </span>

                  {isFractionOwnership ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Частин</span>
                      <Input
                        id="ownershipNumerator"
                        name="ownershipNumerator"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        inputMode="numeric"
                        value={ownershipNumerator}
                        onChange={handleOwnershipPartChange(setOwnershipNumerator)}
                        className="h-9 w-20"
                        required
                      />
                      <span className="text-sm">з</span>
                      <Input
                        id="ownershipDenominator"
                        name="ownershipDenominator"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        inputMode="numeric"
                        value={ownershipDenominator}
                        onChange={handleOwnershipPartChange(setOwnershipDenominator)}
                        className="h-9 w-20"
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <input type="hidden" name="ownershipNumerator" value="1" />
                      <input type="hidden" name="ownershipDenominator" value="1" />
                    </>
                  )}
                </div>
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
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={defaultValues?.email ?? ''}
                  required
                />
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

            {showSubmitButton ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
                {!isPending && submitLabel.startsWith('Додати') ? (
                  <AddIcon className="h-4 w-4" />
                ) : null}
                {isPending ? 'Збереження...' : submitLabel}
              </Button>
            ) : null}
          </fieldset>

          {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}
        </form>
      </CardContent>
    </Card>
  );
}
