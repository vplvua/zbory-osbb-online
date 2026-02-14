'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';

const initialState: ProtocolFormState = {};

type QuestionFormProps = {
  action: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  protocolId: string;
};

type QuestionItemProps = {
  action: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  deleteAction: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  question: {
    id: string;
    orderNumber: number;
    text: string;
    proposal: string;
    requiresTwoThirds: boolean;
  };
};

export function QuestionCreateForm({ action, protocolId }: QuestionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionErrorToast(state.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Нове питання</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
          data-submitting={isPending ? 'true' : 'false'}
        >
          <fieldset disabled={isPending} className="space-y-4">
            <input type="hidden" name="protocolId" value={protocolId} />

            <div className="space-y-2">
              <Label htmlFor="orderNumber">Номер питання</Label>
              <Input id="orderNumber" name="orderNumber" type="number" min={1} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Текст питання</Label>
              <Textarea id="text" name="text" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposal">Пропозиція</Label>
              <Textarea id="proposal" name="proposal" required />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input className="accent-brand" type="checkbox" name="requiresTwoThirds" />
              Потребує 2/3 голосів
            </label>

            {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? <LoadingSpinner className="h-4 w-4" /> : <AddIcon className="h-4 w-4" />}
              {isPending ? 'Додаємо питання...' : 'Додати питання'}
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

export function QuestionItemForm({ action, deleteAction, question }: QuestionItemProps) {
  const [state, formAction, isUpdatePending] = useActionState(action, initialState);
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteAction,
    initialState,
  );
  useActionErrorToast(state.error);
  useActionErrorToast(deleteState.error);
  const isPending = isUpdatePending || isDeletePending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Питання #{question.orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
          data-submitting={isPending ? 'true' : 'false'}
        >
          <fieldset disabled={isPending} className="space-y-4">
            <input type="hidden" name="questionId" value={question.id} />

            <div className="space-y-2">
              <Label htmlFor={`order-${question.id}`}>Номер</Label>
              <Input
                id={`order-${question.id}`}
                name="orderNumber"
                type="number"
                min={1}
                defaultValue={question.orderNumber}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`text-${question.id}`}>Текст</Label>
              <Textarea
                id={`text-${question.id}`}
                name="text"
                defaultValue={question.text}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`proposal-${question.id}`}>Пропозиція</Label>
              <Textarea
                id={`proposal-${question.id}`}
                name="proposal"
                defaultValue={question.proposal}
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                className="accent-brand"
                type="checkbox"
                name="requiresTwoThirds"
                defaultChecked={question.requiresTwoThirds}
              />
              Потребує 2/3 голосів
            </label>

            {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending}>
                {isUpdatePending ? <LoadingSpinner className="h-4 w-4" /> : null}
                {isUpdatePending ? 'Зберігаємо...' : 'Зберегти питання'}
              </Button>
              <ConfirmSubmitButton
                type="submit"
                variant="destructive"
                formAction={deleteFormAction}
                formNoValidate
                confirmMessage="Видалене питання не можна відновити."
                disabled={isPending}
              >
                {isDeletePending ? <LoadingSpinner className="h-4 w-4" /> : null}
                {isDeletePending ? 'Видалення...' : 'Видалити'}
              </ConfirmSubmitButton>
            </div>

            {deleteState.error ? <ErrorAlert>{deleteState.error}</ErrorAlert> : null}
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
