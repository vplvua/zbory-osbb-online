'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';

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
  formId?: string;
  showSubmitButton?: boolean;
  title?: string;
};

export default function ProtocolForm({
  action,
  defaultValues,
  submitLabel,
  formId,
  showSubmitButton = true,
  title = 'Реквізити протоколу',
}: ProtocolFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionErrorToast(state.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id={formId}
          action={formAction}
          className="space-y-4"
          data-submitting={isPending ? 'true' : 'false'}
        >
          <fieldset disabled={isPending} className="space-y-4">
            {defaultValues?.protocolId ? (
              <input type="hidden" name="protocolId" value={defaultValues.protocolId} />
            ) : null}
            {defaultValues?.osbbId ? (
              <input type="hidden" name="osbbId" value={defaultValues.osbbId} />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="number">Номер протоколу</Label>
              <Input
                id="number"
                name="number"
                defaultValue={defaultValues?.number ?? ''}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Дата зборів</Label>
              <div className="w-37.5 max-w-full">
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={defaultValues?.date ?? ''}
                  className="block w-full"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Тип зборів</Label>
              <select
                id="type"
                name="type"
                defaultValue={defaultValues?.type ?? 'GENERAL'}
                className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                required
              >
                <option value="GENERAL">Загальні</option>
                <option value="ESTABLISHMENT">Установчі</option>
              </select>
            </div>

            {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}

            {showSubmitButton ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
                {isPending ? 'Збереження...' : submitLabel}
              </Button>
            ) : null}
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
