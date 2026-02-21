'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Vote } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import DubidocSigningWidget from '@/components/vote/dubidoc-signing-widget';
import { readJsonBody, resolveApiErrorMessage, type ApiErrorCodeMap } from '@/lib/api/client-error';
import { isApiOkDto } from '@/lib/api/error-dto';
import { toast } from '@/lib/toast/client';
import { buildAnswersSignature, isSubmitLockedByExistingSigning } from '@/lib/vote/signing-session';
import type { VoteSheetQuestionDto } from '@/lib/vote/types';

type VoteFormProps = {
  token: string;
  questions: VoteSheetQuestionDto[];
  disabled: boolean;
  hasActiveSigningSession: boolean;
};

type VoteSubmitSuccess = {
  ok: true;
  redirectUrl?: string;
  signRedirectUrl?: string;
  signUrl?: string;
};

const UNKNOWN_VOTE_ERROR_MESSAGE = 'Сталася помилка під час надсилання голосу. Спробуйте ще раз.';
const VOTE_ERROR_MAP: ApiErrorCodeMap = {
  VOTE_INVALID_JSON: 'Невірні дані. Оновіть сторінку та спробуйте ще раз.',
  VOTE_INVALID_PAYLOAD: 'Заповніть усі відповіді та підтвердьте згоду.',
  VOTE_SHEET_NOT_FOUND: 'Листок не знайдено.',
  VOTE_EXPIRED: 'Термін голосування завершено.',
  VOTE_ALREADY_SUBMITTED: 'Листок вже подано та очікує наступного етапу.',
  VOTE_DUPLICATE_QUESTION: 'Питання не можуть повторюватися.',
  VOTE_INCOMPLETE_ANSWERS: 'Потрібно відповісти на всі питання.',
  VOTE_UNKNOWN_QUESTION: 'Відповідь містить невірне питання.',
  VOTE_STATE_CONFLICT: 'Листок більше не доступний для подання.',
  VOTE_SAVE_FAILED: 'Не вдалося зберегти голос. Спробуйте ще раз.',
  VOTE_REFRESH_FAILED: 'Голос збережено, але не вдалося оновити дані листка.',
  VOTE_SIGN_PREPARE_FAILED: 'Не вдалося підготувати документ для підписання. Спробуйте ще раз.',
  VOTE_SIGNING_UNAVAILABLE: 'Сервіс підписання тимчасово недоступний. Спробуйте ще раз.',
  VOTE_SIGNING_NOT_CONFIGURED:
    'Підписання тимчасово недоступне через неповні налаштування ОСББ. Зверніться до відповідальної особи.',
  VOTE_SUBMIT_FAILED: 'Не вдалося зберегти голос. Спробуйте ще раз.',
};

type VoteMap = Record<string, Vote | undefined>;

function buildVoteMap(questions: VoteSheetQuestionDto[]): VoteMap {
  return Object.fromEntries(
    questions.map((question) => [question.id, question.vote ?? undefined]),
  ) as VoteMap;
}

export default function VoteForm({
  token,
  questions,
  disabled,
  hasActiveSigningSession: hasActiveSigningSessionInitial,
}: VoteFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [votes, setVotes] = useState<VoteMap>(() => buildVoteMap(questions));
  const [hasActiveSigningSession, setHasActiveSigningSession] = useState(
    hasActiveSigningSessionInitial,
  );
  const [lockedAnswersSignature, setLockedAnswersSignature] = useState<string | null>(() =>
    hasActiveSigningSessionInitial
      ? buildAnswersSignature(
          questions.map((question) => ({ questionId: question.id, vote: question.vote })),
        )
      : null,
  );
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingSigningUrl, setIsRefreshingSigningUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [isSigningWidgetOpen, setIsSigningWidgetOpen] = useState(false);
  const currentAnswersSignature = useMemo(
    () =>
      buildAnswersSignature(
        questions.map((question) => ({ questionId: question.id, vote: votes[question.id] })),
      ),
    [questions, votes],
  );

  const isComplete = useMemo(() => {
    if (!isConsentChecked) {
      return false;
    }

    return questions.every((question) => Boolean(votes[question.id]));
  }, [isConsentChecked, questions, votes]);

  const hasVotesChangedSinceSigningDraft = useMemo(() => {
    if (!lockedAnswersSignature) {
      return false;
    }

    return currentAnswersSignature !== lockedAnswersSignature;
  }, [currentAnswersSignature, lockedAnswersSignature]);

  const submitLockedByExistingSigning = isSubmitLockedByExistingSigning(
    lockedAnswersSignature,
    currentAnswersSignature,
  );

  const canContinueExistingSigning = hasActiveSigningSession && !hasVotesChangedSinceSigningDraft;

  useEffect(() => {
    if (!hasVotesChangedSinceSigningDraft) {
      return;
    }

    if (signingUrl !== null) {
      setSigningUrl(null);
    }

    if (isSigningWidgetOpen) {
      setIsSigningWidgetOpen(false);
    }
  }, [hasVotesChangedSinceSigningDraft, isSigningWidgetOpen, signingUrl]);

  const handleVoteChange = (questionId: string, vote: Vote) => {
    setVotes((prev) => ({ ...prev, [questionId]: vote }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      disabled ||
      isSubmitting ||
      submitLockRef.current ||
      !isComplete ||
      submitLockedByExistingSigning
    ) {
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

      const payload = await readJsonBody(response);
      if (!response.ok || !isApiOkDto(payload)) {
        const message = resolveApiErrorMessage(payload, {
          codeMap: VOTE_ERROR_MAP,
          fallbackMessage: UNKNOWN_VOTE_ERROR_MESSAGE,
        });
        setError(message);
        toast.error(message);
        return;
      }

      const result = payload as VoteSubmitSuccess;
      const redirectUrl = result.redirectUrl ?? result.signRedirectUrl ?? result.signUrl;
      if (redirectUrl) {
        toast.info('Відповіді збережено. Підпишіть документ нижче.');
        setHasActiveSigningSession(true);
        setLockedAnswersSignature(currentAnswersSignature);
        setSigningUrl(redirectUrl);
        setIsSigningWidgetOpen(true);
        return;
      }

      toast.success('Відповіді збережено.');
      router.refresh();
    } catch {
      const message = UNKNOWN_VOTE_ERROR_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRefreshSigningLink = async () => {
    if (isRefreshingSigningUrl) {
      return;
    }

    setIsRefreshingSigningUrl(true);
    setError(null);
    try {
      const response = await fetch(`/api/vote/${encodeURIComponent(token)}/sign-link`, {
        method: 'POST',
      });
      const payload = await readJsonBody(response);
      if (!response.ok || !isApiOkDto(payload)) {
        const message = resolveApiErrorMessage(payload, {
          codeMap: VOTE_ERROR_MAP,
          fallbackMessage: UNKNOWN_VOTE_ERROR_MESSAGE,
        });
        setError(message);
        toast.error(message);
        return;
      }

      const result = payload as VoteSubmitSuccess;
      const redirectUrl = result.redirectUrl ?? result.signRedirectUrl ?? result.signUrl;
      if (!redirectUrl) {
        const message = UNKNOWN_VOTE_ERROR_MESSAGE;
        setError(message);
        toast.error(message);
        return;
      }

      setSigningUrl(redirectUrl);
      setIsSigningWidgetOpen(true);
      toast.info('Відкриваємо підписання в Dubidoc.');
    } catch {
      const message = UNKNOWN_VOTE_ERROR_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      setIsRefreshingSigningUrl(false);
    }
  };

  const handleContinueSigning = async () => {
    if (signingUrl) {
      setIsSigningWidgetOpen(true);
      return;
    }

    await handleRefreshSigningLink();
  };

  if (signingUrl && isSigningWidgetOpen) {
    return (
      <DubidocSigningWidget
        signingUrl={signingUrl}
        onClose={() => {
          setIsSigningWidgetOpen(false);
        }}
      />
    );
  }

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
                    handleVoteChange(question.id, 'FOR');
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
                    handleVoteChange(question.id, 'AGAINST');
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

        {canContinueExistingSigning ? (
          <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-3">
            <p className="text-sm text-sky-800">Поверніться до підписання документа в Dubidoc.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleContinueSigning}>
                Продовжити підписання
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRefreshSigningLink}
                disabled={isRefreshingSigningUrl}
              >
                {isRefreshingSigningUrl ? <LoadingSpinner className="h-4 w-4" /> : null}
                {isRefreshingSigningUrl ? 'Оновлюємо...' : 'Оновити посилання'}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <ErrorAlert>{error}</ErrorAlert> : null}

        <div className="space-y-2">
          <Button
            type="submit"
            disabled={!isComplete || disabled || isSubmitting || submitLockedByExistingSigning}
          >
            {isSubmitting ? <LoadingSpinner className="h-4 w-4" /> : null}
            {isSubmitting ? 'Переходимо до підпису...' : 'Підписати електронним підписом'}
          </Button>
          {submitLockedByExistingSigning ? (
            <p className="text-muted-foreground text-xs">
              Щоб сформувати новий листок для підпису, змініть хоча б одну відповідь.
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Після надсилання голосу відкриється підпис або оновиться статус листка.
          </p>
        </div>
      </fieldset>
    </form>
  );
}
