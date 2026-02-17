import { z } from 'zod';

export const ownerSchema = z.object({
  lastName: z.string().trim().min(2).max(100),
  firstName: z.string().trim().min(2).max(100),
  middleName: z.string().trim().min(2).max(100),
  apartmentNumber: z.string().trim().min(1).max(20),
  totalArea: z.coerce.number().positive(),
  ownershipNumerator: z.coerce.number().int().min(1),
  ownershipDenominator: z.coerce.number().int().min(1),
  ownershipDocument: z.string().trim().min(5).max(500),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().or(z.literal('')),
  representativeName: z.string().trim().max(200).optional().or(z.literal('')),
  representativeDocument: z.string().trim().max(500).optional().or(z.literal('')),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
