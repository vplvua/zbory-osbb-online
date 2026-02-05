import { z } from 'zod';

export const protocolSchema = z.object({
  number: z.string().trim().min(1).max(50),
  date: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Невірна дата',
    }),
  type: z.enum(['ESTABLISHMENT', 'GENERAL']),
});

export type ProtocolInput = z.infer<typeof protocolSchema>;
