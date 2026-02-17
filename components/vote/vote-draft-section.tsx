'use client';

import { useState } from 'react';
import CountdownTimer from '@/components/vote/countdown-timer';
import { ErrorAlert } from '@/components/ui/error-alert';
import VoteForm from '@/components/vote/vote-form';
import type { VoteSheetQuestionDto } from '@/lib/vote/types';

type VoteDraftSectionProps = {
  token: string;
  createdAt: string;
  expiresAt: string;
  initialNow: string;
  questions: VoteSheetQuestionDto[];
  initiallyExpired: boolean;
};

export default function VoteDraftSection({
  token,
  createdAt,
  expiresAt,
  initialNow,
  questions,
  initiallyExpired,
}: VoteDraftSectionProps) {
  const [isExpired, setIsExpired] = useState(initiallyExpired);

  return (
    <section className="space-y-4">
      <CountdownTimer
        createdAt={createdAt}
        expiresAt={expiresAt}
        initialNow={initialNow}
        onExpiredChange={setIsExpired}
      />
      {isExpired ? (
        <ErrorAlert>Термін голосування завершено. Надсилання голосу недоступне.</ErrorAlert>
      ) : (
        <VoteForm token={token} questions={questions} disabled={false} />
      )}
    </section>
  );
}
