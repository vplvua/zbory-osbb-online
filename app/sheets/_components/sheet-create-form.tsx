'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SheetFormState } from '@/app/sheets/actions';

const initialState: SheetFormState = {};

type SheetCreateFormProps = {
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
  protocols: Array<{
    id: string;
    number: string;
    dateLabel: string;
  }>;
  owners: Array<{
    id: string;
    fullName: string;
    apartmentNumber: string;
  }>;
  defaultSurveyDate: string;
};

export default function SheetCreateForm({
  action,
  protocols,
  owners,
  defaultSurveyDate,
}: SheetCreateFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новий листок опитування</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="protocolId">Протокол</Label>
            <select
              id="protocolId"
              name="protocolId"
              required
              className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="" disabled>
                Оберіть протокол
              </option>
              {protocols.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.number} ({protocol.dateLabel})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerId">Співвласник</Label>
            <select
              id="ownerId"
              name="ownerId"
              required
              className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="" disabled>
                Оберіть співвласника
              </option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName} (кв. {owner.apartmentNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surveyDate">Дата проведення опитування</Label>
            <Input
              id="surveyDate"
              name="surveyDate"
              type="date"
              defaultValue={defaultSurveyDate}
              required
            />
          </div>

          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

          <Button type="submit">Створити листок</Button>
        </form>
      </CardContent>
    </Card>
  );
}
