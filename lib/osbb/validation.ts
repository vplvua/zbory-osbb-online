import { z } from 'zod';

export const osbbSchema = z.object({
  name: z.string().trim().min(3).max(200),
  address: z.string().trim().min(5).max(300),
  edrpou: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
});

export type OsbbInput = z.infer<typeof osbbSchema>;
