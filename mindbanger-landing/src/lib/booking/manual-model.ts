import { z } from 'zod';

export const manualContactSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.email().max(254).transform(v => v.toLowerCase()),
  phone: z.string().trim().max(40).regex(/^[+\d\s().-]*$/),
  city: z.string().trim().max(100),
  country: z.enum(['SK', 'CZ', 'other']),
}).strict();
export type ManualContact = z.input<typeof manualContactSchema>;

export const manualBookingSchema = z.object({
  userId: z.uuid(), serviceId: z.string().min(2).max(50),
  startsAt: z.iso.datetime({ offset: true }), requestId: z.uuid(),
  price: z.number().finite().min(0).max(10000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001),
  note: z.string().trim().max(500).default(''), agreed: z.literal(true),
  participantName: z.string().trim().max(100).default(''),
  participantAge: z.number().int().min(0).max(17).default(0),
  guardianConsent: z.boolean().default(false),
}).strict().superRefine((b, ctx) => {
  if (b.participantAge && (b.participantAge < 13 || b.serviceId !== 'teenager-pod-tlakom' || b.participantName.length < 2 || !b.guardianConsent)) {
    ctx.addIssue({ code: 'custom', path: ['participantAge'], message: 'Pri neplnoletom teenagerovi od 13 rokov uveď meno a potvrď dohodu so zákonným zástupcom.' });
  }
  if (!b.participantAge && (b.participantName || b.guardianConsent)) ctx.addIssue({ code: 'custom', path: ['participantName'], message: 'Skontroluj údaje účastníka.' });
});

export function canUseMeeting(b: { status: string; paid: boolean; funding_type?: string }) {
  return b.status === 'confirmed' && (b.paid || b.funding_type === 'manual');
}

export function bratislavaInstant(value: string) {
  const raw = Date.parse(value + ':00Z');
  if (!Number.isFinite(raw)) throw Error('Vyber dátum a čas.');
  const format = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const matches: string[] = [];
  for (let t = raw - 3 * 3600000; t <= raw + 3 * 3600000; t += 60000) if (format.format(new Date(t)).replace(' ', 'T') === value) matches.push(new Date(t).toISOString());
  if (matches.length !== 1) throw Error('Pri zmene letného času je tento čas neplatný alebo nejednoznačný. Vyber iný čas.');
  return matches[0];
}
