'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { Vote } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { VoteSheetQuestionDto } from '@/lib/vote/types';

type VoteFormProps = {
  token: string;
  questions: VoteSheetQuestionDto[];
  disabled: boolean;
};

type VoteSubmitResult = {
  ok: boolean;
  message?: string;
  redirectUrl?: string;
  signRedirectUrl?: string;
  signUrl?: string;
};

export default function VoteForm({ token, questions, disabled }: VoteFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [votes, setVotes] = useState<Record<string, Vote | undefined>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, question.vote ?? undefined])),
  );
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = useMemo(() => {
    if (!isConsentChecked) {
      return false;
    }

    return questions.every((question) => Boolean(votes[question.id]));
  }, [isConsentChecked, questions, votes]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || isSubmitting || submitLockRef.current || !isComplete) {
      return;
    }

    submitLockRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/vote/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            vote: votes[question.id],
          })),
          consent: isConsentChecked,
        }),
      });

      const result = (await response.json()) as VoteSubmitResult;

      if (!response.ok || !result.ok) {
        setError(result.message ?? 'Не вдалося надіслати голос.');
        return;
      }

      const redirectUrl = result.redirectUrl ?? result.signRedirectUrl ?? result.signUrl;
      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      router.refresh();
    } catch {
      setError('Сталася помилка під час надсилання голосу. Спробуйте ще раз.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <fieldset className="space-y-6" disabled={disabled || isSubmitting}>
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

        {error ? <ErrorAlert>{error}</ErrorAlert> : null}

        <div className="space-y-2">
          <Button type="submit" disabled={!isComplete || disabled || isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="h-4 w-4" /> : null}
            {isSubmitting ? 'Переходимо до підпису...' : 'Підписати електронним підписом'}
          </Button>
          <p className="text-muted-foreground text-xs">
            Після надсилання голосу відкриється підпис або оновиться статус листка.
          </p>
        </div>
      </fieldset>
    </form>
  );
}
