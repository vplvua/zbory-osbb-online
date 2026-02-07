'use client';

import { useState } from 'react';
import CountdownTimer from '@/components/vote/countdown-timer';
import VoteForm from '@/components/vote/vote-form';
import type { VoteSheetQuestionDto } from '@/lib/vote/types';

type VoteDraftSectionProps = {
  createdAt: string;
  expiresAt: string;
  questions: VoteSheetQuestionDto[];
  initiallyExpired: boolean;
};

export default function VoteDraftSection({
  createdAt,
  expiresAt,
  questions,
  initiallyExpired,
}: VoteDraftSectionProps) {
  const [isExpired, setIsExpired] = useState(initiallyExpired);

  return (
    <section className="space-y-4">
      <CountdownTimer createdAt={createdAt} expiresAt={expiresAt} onExpiredChange={setIsExpired} />
      <VoteForm questions={questions} disabled={isExpired} />
    </section>
  );
}
