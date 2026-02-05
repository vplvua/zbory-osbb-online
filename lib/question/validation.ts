import { z } from 'zod';

export const questionSchema = z.object({
  orderNumber: z.coerce.number().int().min(1),
  text: z.string().trim().min(10).max(2000),
  proposal: z.string().trim().min(10).max(5000),
  requiresTwoThirds: z.boolean(),
});

export type QuestionInput = z.infer<typeof questionSchema>;
