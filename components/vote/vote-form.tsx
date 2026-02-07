'use client';

import { useMemo, useState } from 'react';
import type { Vote } from '@prisma/client';
import { Button } from '@/components/ui/button';
import type { VoteSheetQuestionDto } from '@/lib/vote/types';

type VoteFormProps = {
  questions: VoteSheetQuestionDto[];
  disabled: boolean;
};

export default function VoteForm({ questions, disabled }: VoteFormProps) {
  const [votes, setVotes] = useState<Record<string, Vote | undefined>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, question.vote ?? undefined])),
  );
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  const isComplete = useMemo(() => {
    if (!isConsentChecked) {
      return false;
    }

    return questions.every((question) => Boolean(votes[question.id]));
  }, [isConsentChecked, questions, votes]);

  return (
    <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <fieldset className="space-y-6" disabled={disabled}>
        {questions.map((question, index) => (
          <article key={question.id} className="border-border rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">
              Питання {index + 1} з {questions.length}
            </p>
            <h3 className="mt-1 text-base font-medium">{question.text}</h3>
            <p className="text-foreground/80 mt-2 text-sm">Пропозиція: {question.proposal}</p>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="border-border inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  className="accent-brand"
                  type="radio"
                  name={`vote-${question.id}`}
                  value="FOR"
                  checked={votes[question.id] === 'FOR'}
                  onChange={() => {
                    setVotes((prev) => ({ ...prev, [question.id]: 'FOR' }));
                  }}
                />
                За
              </label>

              <label className="border-border inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  className="accent-brand"
                  type="radio"
                  name={`vote-${question.id}`}
                  value="AGAINST"
                  checked={votes[question.id] === 'AGAINST'}
                  onChange={() => {
                    setVotes((prev) => ({ ...prev, [question.id]: 'AGAINST' }));
                  }}
                />
                Проти
              </label>
            </div>
          </article>
        ))}

        <label className="text-foreground flex items-start gap-2 text-sm">
          <input
            className="accent-brand mt-1"
            type="checkbox"
            checked={isConsentChecked}
            onChange={(event) => setIsConsentChecked(event.target.checked)}
          />
          Надаю згоду на обробку персональних даних
        </label>

        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Увага! Після підписання зміни неможливі.
        </p>

        <div className="space-y-2">
          <Button type="submit" disabled={!isComplete || disabled}>
            Підписати електронним підписом
          </Button>
          <p className="text-muted-foreground text-xs">
            Підписання через Dubidoc буде додано на наступному етапі.
          </p>
        </div>
      </fieldset>
    </form>
  );
}
