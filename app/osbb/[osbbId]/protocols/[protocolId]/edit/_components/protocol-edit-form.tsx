'use client';

import type { SVGProps } from 'react';
import { useActionState, useMemo, useState } from 'react';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';

const initialState: ProtocolFormState = {};

type EditableQuestion = {
  clientId: string;
  id?: string;
  text: string;
  proposal: string;
  requiresTwoThirds: boolean;
};

type ProtocolEditFormProps = {
  formId: string;
  action: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  defaultValues: {
    protocolId: string;
    number: string;
    date: string;
    type: 'ESTABLISHMENT' | 'GENERAL';
    questions: Array<{
      id: string;
      text: string;
      proposal: string;
      requiresTwoThirds: boolean;
    }>;
  };
};

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `tmp-${Math.random().toString(36).slice(2)}`;
}

export default function ProtocolEditForm({ formId, action, defaultValues }: ProtocolEditFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  const initialQuestions = useMemo<EditableQuestion[]>(
    () =>
      defaultValues.questions.map((question) => ({
        clientId: createClientId(),
        id: question.id,
        text: question.text,
        proposal: question.proposal,
        requiresTwoThirds: question.requiresTwoThirds,
      })),
    [defaultValues.questions],
  );

  const [questions, setQuestions] = useState<EditableQuestion[]>(initialQuestions);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        clientId: createClientId(),
        text: '',
        proposal: '',
        requiresTwoThirds: false,
      },
    ]);
  };

  const removeQuestion = (clientId: string) => {
    setQuestions((prev) => prev.filter((question) => question.clientId !== clientId));
  };

  const updateQuestion = (
    clientId: string,
    field: 'text' | 'proposal' | 'requiresTwoThirds',
    value: string | boolean,
  ) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.clientId !== clientId) {
          return question;
        }

        if (field === 'requiresTwoThirds') {
          return {
            ...question,
            requiresTwoThirds: Boolean(value),
          };
        }

        return {
          ...question,
          [field]: String(value),
        };
      }),
    );
  };

  return (
    <form id={formId} action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Реквізити протоколу</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="hidden" name="protocolId" value={defaultValues.protocolId} />

          <div className="space-y-2">
            <Label htmlFor="number">Номер протоколу</Label>
            <Input id="number" name="number" defaultValue={defaultValues.number} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Дата зборів</Label>
            <Input id="date" name="date" type="date" defaultValue={defaultValues.date} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Тип зборів</Label>
            <select
              id="type"
              name="type"
              defaultValue={defaultValues.type}
              className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              required
            >
              <option value="GENERAL">Загальні</option>
              <option value="ESTABLISHMENT">Установчі</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Питання порядку денного</h2>

        {questions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Питання ще не додані.</p>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.clientId}>
                <CardHeader>
                  <CardTitle>Питання #{index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {question.id ? (
                    <input type="hidden" name={`questions.${index}.id`} value={question.id} />
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor={`question-text-${question.clientId}`}>Текст питання</Label>
                    <Textarea
                      id={`question-text-${question.clientId}`}
                      name={`questions.${index}.text`}
                      value={question.text}
                      onChange={(event) => {
                        updateQuestion(question.clientId, 'text', event.target.value);
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`question-proposal-${question.clientId}`}>Пропозиція</Label>
                    <Textarea
                      id={`question-proposal-${question.clientId}`}
                      name={`questions.${index}.proposal`}
                      value={question.proposal}
                      onChange={(event) => {
                        updateQuestion(question.clientId, 'proposal', event.target.value);
                      }}
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      className="accent-brand"
                      type="checkbox"
                      name={`questions.${index}.requiresTwoThirds`}
                      checked={question.requiresTwoThirds}
                      onChange={(event) => {
                        updateQuestion(
                          question.clientId,
                          'requiresTwoThirds',
                          event.target.checked,
                        );
                      }}
                    />
                    Потребує 2/3 голосів
                  </label>

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      removeQuestion(question.clientId);
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Видалити
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button type="button" onClick={addQuestion}>
          <AddIcon className="h-4 w-4" />
          Додати питання
        </Button>
      </section>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
    </form>
  );
}
