import { z } from 'zod';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const sheetCreateSchema = z.object({
  protocolId: z.string().trim().min(1),
  ownerId: z.string().trim().min(1),
  surveyDate: z
    .string()
    .trim()
    .regex(DATE_ONLY_PATTERN)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Невірна дата',
    }),
});

export const sheetBulkCreateSchema = z.object({
  protocolId: z.string().trim().min(1),
  ownerIds: z.array(z.string().trim().min(1)).min(1),
  surveyDate: z
    .string()
    .trim()
    .regex(DATE_ONLY_PATTERN)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Невірна дата',
    }),
});

export type SheetCreateInput = z.infer<typeof sheetCreateSchema>;
export type SheetBulkCreateInput = z.infer<typeof sheetBulkCreateSchema>;
