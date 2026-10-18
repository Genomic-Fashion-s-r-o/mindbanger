import { z } from 'zod';

export const TIME_ZONE = 'Europe/Bratislava';
export const LEGAL_VERSION = '2026-10-18-online-v1';
export const BOOKING_PAYMENTS_ENABLED = false;
export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,50}$/),
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  minutes: z.number().int().min(30).max(180),
  price: z.number().min(0).max(1000),
  active: z.boolean(),
});
const hoursSchema = z.object({ day: z.number().int().min(0).max(6), open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), enabled: z.boolean() });
export const settingsSchema = z.object({
  enabled: z.boolean(), legalReviewed: z.boolean(), pricesApproved: z.boolean(),
  provider: z.string().trim().max(150), companyId: z.string().trim().max(30), registration: z.string().trim().max(300),
  registeredAddress: z.string().trim().max(300), address: z.string().trim().max(300),
  email: z.union([z.literal(''), z.email()]), phone: z.string().trim().max(50),
  cancellationHours: z.number().int().min(0).max(168),
  leadHours: z.number().int().min(1).max(168), horizonDays: z.number().int().min(7).max(180),
  bufferMinutes: z.number().int().min(0).max(60), holdHours: z.number().int().min(1).max(72),
  slotMinutes: z.union([z.literal(15), z.literal(30)]).default(30),
  hours: z.array(hoursSchema).length(7).refine(h => new Set(h.map(x => x.day)).size === 7 && h.every(x => !x.enabled || x.open < x.close), 'Skontrolujte pracovné hodiny.'),
  services: z.array(serviceSchema).min(1).max(15).refine(s => new Set(s.map(x => x.id)).size === s.length, 'Služby musia mať jedinečné ID.'),
}).superRefine((s, ctx) => {
  if (s.enabled && (!s.legalReviewed || !s.pricesApproved || !s.provider || !s.companyId || !s.registration || !s.registeredAddress || !s.address || !s.email || !s.phone || !s.hours.some(h => h.enabled) || !s.services.some(x => x.active))) {
    ctx.addIssue({ code: 'custom', message: 'Pred zapnutím doplňte údaje prevádzkovateľa, kontakt, služby, hodiny a potvrďte kontrolu podmienok aj cien.' });
  }
});
export type BookingSettings = z.infer<typeof settingsSchema>;
export type Service = z.infer<typeof serviceSchema>;
export const DEFAULT_SETTINGS: BookingSettings = {
  enabled: false, legalReviewed: false, pricesApproved: false,
  provider: '', companyId: '', registration: '', registeredAddress: '', address: 'Online · Spôsob pripojenia dohodneme emailom.', email: '', phone: '',
  cancellationHours: 24, leadHours: 24, horizonDays: 60, bufferMinutes: 15, holdHours: 24, slotMinutes: 30,
  hours: Array.from({ length: 7 }, (_, day) => ({ day, open: '09:00', close: '17:00', enabled: day > 0 && day < 6 })),
  services: [
    { id: 'uvodne-stretnutie', name: 'Úvodné stretnutie', description: 'Zoznámime sa, prejdeme vaše očakávania a vyskúšame vedenú hypnotickú relaxáciu.', minutes: 60, price: 55, active: true },
    { id: 'hypnoticke-sedenie', name: 'Individuálna hypnóza', description: 'Vedené hypnotické techniky, predstavivosť a nácvik práce s pozornosťou.', minutes: 60, price: 50, active: true },
    { id: 'relaxacia', name: 'Hypnotická relaxácia', description: 'Priestor na spomalenie, uvoľnenie a nácvik relaxácie pre každodenný život.', minutes: 60, price: 65, active: true },
    { id: 'mentalny-trening', name: 'Mentálny tréning športovca', description: 'Práca s koncentráciou, vizualizáciou a prípravou na športový výkon.', minutes: 60, price: 45, active: true },
    { id: 'coaching', name: 'Coaching a osobný rozvoj', description: 'Praktická práca s cieľmi, každodennými návykmi a organizáciou času.', minutes: 60, price: 45, active: true },
  ],
};
export const requestSchema = z.object({
  serviceId: z.string().min(2).max(50), startsAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(100), email: z.email().max(254), phone: z.string().trim().max(40),
  adult: z.literal(true), accepted: z.literal(true), website: z.string().max(200).default(''),
  requestId: z.uuid(), legalVersion: z.literal(LEGAL_VERSION),
});
export const clientBookingSchema = requestSchema.omit({ name: true, email: true, website: true }).strict();
export type Appointment = {
  id: string; kind: 'booking' | 'block'; status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'completed' | 'no_show' | 'blocked';
  starts_at: string; ends_at: string; busy_until: string; hold_until: string | null;
  service_name: string; price: number; customer_name: string | null; email: string | null; phone: string | null;
  paid: boolean; location: string; created_at: string;
};
export const statusLabels: Record<Appointment['status'], string> = { pending: 'Čaká na potvrdenie', confirmed: 'Potvrdená', cancelled: 'Zrušená', expired: 'Vypršala', completed: 'Absolvovaná', no_show: 'Klient neprišiel', blocked: 'Blokovaný čas' };
export function money(value: number) { return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value); }
export function dateLabel(value: string) { return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(new Date(value)); }
export function localDate(value: Date) { return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value); }
