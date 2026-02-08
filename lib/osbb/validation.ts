import { z } from 'zod';

export const osbbSchema = z.object({
  name: z.string().trim().min(3).max(200),
  shortName: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
  edrpou: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
  organizerName: z.string().trim().min(2).max(200),
  organizerEmail: z.string().trim().email(),
  organizerPhone: z
    .string()
    .trim()
    .regex(/^\+380\d{9}$/),
});

export type OsbbInput = z.infer<typeof osbbSchema>;
