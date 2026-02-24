'use client';

import { useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';
import { useUnsavedChangesGuard } from '@/lib/forms/use-unsaved-changes-guard';
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
  leaveConfirmationMessage?: string;
};

export default function ProtocolForm({
  action,
  defaultValues,
  submitLabel,
  formId,
  showSubmitButton = true,
  title = 'Реквізити протоколу',
  leaveConfirmationMessage,
}: ProtocolFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const { isLeaveModalOpen, handleConfirmLeave, handleCloseLeaveModal } = useUnsavedChangesGuard({
    formRef,
    enabled: Boolean(leaveConfirmationMessage),
  });
  useActionErrorToast(state.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id={formId}
          ref={formRef}
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
      {leaveConfirmationMessage ? (
        <ConfirmModal
          open={isLeaveModalOpen}
          title="Незбережені зміни"
          description={leaveConfirmationMessage}
          confirmLabel="Вийти"
          cancelLabel="Залишитись"
          confirmVariant="primary"
          onConfirm={handleConfirmLeave}
          onClose={handleCloseLeaveModal}
        />
      ) : null}
    </Card>
  );
}
