import { z } from 'zod';

export const voteAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  vote: z.enum(['FOR', 'AGAINST']),
});

export const voteSubmitSchema = z.object({
  answers: z.array(voteAnswerSchema).min(1),
  consent: z.literal(true),
});

export type VoteSubmitInput = z.infer<typeof voteSubmitSchema>;
