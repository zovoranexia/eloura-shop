import 'server-only';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { MUNICIPALITY_KEYS, DILI_POST_KEYS } from '@/lib/geo';
import { normalizePhone } from '@/lib/phone';

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal('')),
  recipient: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(25),
  municipality: z.string().refine((m) => MUNICIPALITY_KEYS.includes(m), 'INVALID'),
  adminPost: z.string().trim().max(40).optional().or(z.literal('')),
  suco: z.string().trim().max(80).optional().or(z.literal('')),
  street: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
}).superRefine((a, ctx) => {
  if (a.municipality === 'dili' && !DILI_POST_KEYS.includes(a.adminPost || '')) ctx.addIssue({ code: 'custom', path: ['adminPost'], message: 'REQUIRED' });
});

export function addressData(b: z.infer<typeof addressSchema>) {
  const p = normalizePhone(b.phone);
  if (!p.valid) throw new AppError(422, 'INVALID_PHONE');
  return {
    label: b.label || null, recipient: b.recipient, phone: p.e164, municipality: b.municipality, adminPost: b.adminPost || null,
    suco: b.suco || null, street: b.street, notes: b.notes || null,
  };
}

