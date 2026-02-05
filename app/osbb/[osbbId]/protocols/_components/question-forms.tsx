'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';

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
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Нове питання</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
            <input type="checkbox" name="requiresTwoThirds" />
            Потребує 2/3 голосів
          </label>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <Button type="submit">Додати питання</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function QuestionItemForm({ action, deleteAction, question }: QuestionItemProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Питання #{question.orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
              type="checkbox"
              name="requiresTwoThirds"
              defaultChecked={question.requiresTwoThirds}
            />
            Потребує 2/3 голосів
          </label>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit">Зберегти питання</Button>
            <form action={deleteFormAction}>
              <input type="hidden" name="questionId" value={question.id} />
              <Button type="submit" variant="destructive">
                Видалити
              </Button>
            </form>
          </div>

          {deleteState.error ? <p className="text-sm text-red-600">{deleteState.error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
