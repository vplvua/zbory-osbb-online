import type { Vote } from '@prisma/client';

type SavedAnswer = {
  questionId: string;
  vote: Vote | null;
};

type SubmittedAnswer = {
  questionId: string;
  vote: Vote;
};

type AnswerSignatureItem = {
  questionId: string;
  vote: Vote | null | undefined;
};

export function hasAnswersChanged(
  savedAnswers: SavedAnswer[],
  submittedAnswers: SubmittedAnswer[],
): boolean {
  if (savedAnswers.length !== submittedAnswers.length) {
    return true;
  }

  const savedVotes = new Map(savedAnswers.map((answer) => [answer.questionId, answer.vote]));
  return submittedAnswers.some((answer) => savedVotes.get(answer.questionId) !== answer.vote);
}

export function buildAnswersSignature(items: AnswerSignatureItem[]): string {
  return items.map((item) => `${item.questionId}:${item.vote ?? 'NONE'}`).join('|');
}

export function isSubmitLockedByExistingSigning(
  lockedAnswersSignature: string | null,
  currentAnswersSignature: string,
): boolean {
  return Boolean(lockedAnswersSignature) && lockedAnswersSignature === currentAnswersSignature;
}
