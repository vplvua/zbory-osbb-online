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
          <article key={question.id} className="rounded-lg border border-neutral-200 p-4">
            <p className="text-sm text-neutral-600">
              Питання {index + 1} з {questions.length}
            </p>
            <h3 className="mt-1 text-base font-medium">{question.text}</h3>
            <p className="mt-2 text-sm text-neutral-700">Пропозиція: {question.proposal}</p>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <input
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

              <label className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <input
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

        <label className="flex items-start gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={isConsentChecked}
            onChange={(event) => setIsConsentChecked(event.target.checked)}
            className="mt-1"
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
          <p className="text-xs text-neutral-600">
            Підписання через Dubidoc буде додано на наступному етапі.
          </p>
        </div>
      </fieldset>
    </form>
  );
}
