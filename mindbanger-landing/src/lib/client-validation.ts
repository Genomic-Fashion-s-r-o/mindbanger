import { z } from 'zod';
import { CLIENT_TERMS_VERSION } from './client-platform';
export const clientProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Zadajte meno a priezvisko.').max(100),
  language: z.enum(['sk', 'cs', 'en']),
  timezone: z.string().max(100).refine(v => { try { new Intl.DateTimeFormat('sk', { timeZone: v }); return true; } catch { return false; } }, 'Vyberte platné časové pásmo.'),
  accepted: z.literal(true).optional(),
  termsVersion: z.literal(CLIENT_TERMS_VERSION).optional(),
}).strict().refine(v => !v.accepted || v.termsVersion === CLIENT_TERMS_VERSION, 'Potvrďte aktuálne podmienky.');
