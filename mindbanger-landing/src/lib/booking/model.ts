import{localeTag,type PortalLocale}from '@/lib/portal-locale';
import { z } from 'zod';
import { plannerSchema } from './planner';
import { COACHING, COACHING_TOPICS } from './offer';

export const TIME_ZONE = 'Europe/Bratislava';
export const LEGAL_VERSION = '2026-10-19-coaching-v2';
export const BOOKING_PAYMENTS_ENABLED = false;
export const PAYMENT_TERMS_VERSION = '2026-10-19-payment-v1';
export const AUTHORIZATION_TERMS_VERSION = '2026-10-19-authorization-v1';
export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,50}$/),
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  minutes: z.number().int().min(25).max(180),
  price: z.number().min(0).max(100000).multipleOf(.01),
  active: z.boolean(),
  slotMinutes: z.number().int().min(30).max(600).multipleOf(30).optional(),
  guardian: z.boolean().optional(),
});
export const packageSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]{1,50}$/),name:z.string().min(3).max(150),serviceId:z.string().min(2).max(50),sessions:z.number().int().min(2).max(20),creditMinutes:z.number().int().min(30).max(1200).multipleOf(30).optional(),validityMonths:z.literal(12).optional(),price:z.number().positive().max(100000).multipleOf(.01),active:z.boolean(),extras:z.string().max(500),description:z.string().max(1000)});
const hoursSchema = z.object({ day: z.number().int().min(0).max(6), open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), enabled: z.boolean() });
export const settingsSchema = z.object({
  locale: z.enum(['sk','cs','en']).default('sk'), currency: z.enum(['eur','czk']).default('eur'),
  enabled: z.boolean(), legalReviewed: z.boolean(), pricesApproved: z.boolean(),
  provider: z.string().trim().max(150), companyId: z.string().trim().max(30), registration: z.string().trim().max(300),
  registeredAddress: z.string().trim().max(300), address: z.string().trim().max(300),
  email: z.union([z.literal(''), z.email()]), phone: z.string().trim().max(50),
  cancellationHours: z.number().int().min(0).max(168),
  paymentHours: z.number().int().min(1).max(72).default(24),
  lateCancellation: z.enum(['refund', 'individual']).default('refund'),
  leadHours: z.number().int().min(1).max(168), horizonDays: z.number().int().min(7).max(180),
  bufferMinutes: z.number().int().min(10).max(60), holdHours: z.number().int().min(1).max(72),
  slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(60),
  stripeEnabled: z.boolean().default(false),
  paymentMode: z.enum(['confirm_then_pay','authorize_confirm']).default('confirm_then_pay'),
  catalogVersion:z.number().int().min(1).max(2).default(1),
  packages:z.array(packageSchema).max(20).default([]),
  planner: plannerSchema.optional(),
  hours: z.array(hoursSchema).length(7).refine(h => new Set(h.map(x => x.day)).size === 7 && h.every(x => !x.enabled || x.open < x.close), 'Skontrolujte pracovné hodiny.'),
  services: z.array(serviceSchema).min(1).max(15).refine(s => new Set(s.map(x => x.id)).size === s.length, 'Služby musia mať jedinečné ID.'),
}).superRefine((s, ctx) => {
  if(s.catalogVersion===2&&(s.paymentMode!=='authorize_confirm'||s.bufferMinutes!==10||s.services.some(v=>v.active&&v.price<=0)))ctx.addIssue({code:'custom',message:'Nová ponuka používa autorizáciu karty, 10-minútovú prestávku a kladné ceny.'});
  if (s.catalogVersion===2?s.services.some(v=>v.active&&(![25,50,80].includes(v.minutes)||(v.minutes===25?v.id!=='rychly-rozhovor'||v.slotMinutes!==30:(v.slotMinutes!==undefined&&v.slotMinutes!==v.minutes+10)))):s.services.some(v=>v.minutes!==50)||s.services.some(v=>v.id===COACHING.id&&v.price!==49)) ctx.addIssue({ code: 'custom', message: 'Rýchly rozhovor má 25 minút a 30-minútový blok; ostatné stretnutia majú 50 alebo 80 minút a 10-minútovú prestávku.' });
  // An explicitly empty planner means closed availability, even while the portal is enabled.
  const hasHours = s.planner ? true : s.hours.some(h => h.enabled);
  if (s.enabled && (!s.legalReviewed || !s.pricesApproved || !s.provider || !s.companyId || !s.registration || !s.registeredAddress || !s.address || !s.email || !s.phone || !hasHours || !s.services.some(x => x.active))) {
    ctx.addIssue({ code: 'custom', message: 'Pred zapnutím doplňte údaje prevádzkovateľa, kontakt, služby, hodiny a potvrďte kontrolu podmienok aj cien.' });
  }
});
export type BookingSettings = z.infer<typeof settingsSchema>;
export type Service = z.infer<typeof serviceSchema>;
export function normalizeCoachingSettings(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const cfg = value as Record<string, unknown>;
  if(cfg.catalogVersion===2)return {...cfg,services:Array.isArray(cfg.services)?cfg.services.map((s:Service)=>s.id==='teenager-pod-tlakom'&&s.description?.includes('Pre vek 13–17')?{...s,description:s.description.replace(/Pre vek 13–17(?: rokov)? rezervuje zákonný zástupca\./,'Koučing pre mladých vo veku 13–19 rokov. Do 18 rokov rezervuje zákonný zástupca; od 18 rokov klient samostatne.')}:s):cfg.services};
  const legacy = ['uvodne-stretnutie', 'hypnoticke-sedenie', 'relaxacia', 'mentalny-trening', 'coaching'];
  const services = Array.isArray(cfg.services) ? cfg.services as Service[] : [];
  return { ...cfg, provider: cfg.provider || 'Milkam s. r. o.', companyId: cfg.companyId || '46141472', registeredAddress: cfg.registeredAddress || 'Lúčky 1529/3, 908 51 Holíč, Slovenská republika', slotMinutes: 60, bufferMinutes: Math.max(10, Number(cfg.bufferMinutes) || 10), services: [COACHING, ...services.filter(s => s.id !== COACHING.id).map(s => ({ ...s, minutes: 50, active: legacy.includes(s.id) ? false : s.active }))] };
}
export const DEFAULT_SETTINGS: BookingSettings = {
  locale:'sk',currency:'eur',
  catalogVersion:1,packages:[],
  enabled: false, legalReviewed: false, pricesApproved: false,
  provider: 'Milkam s. r. o.', companyId: '46141472', registration: '', registeredAddress: 'Lúčky 1529/3, 908 51 Holíč, Slovenská republika', address: 'Online · Spôsob pripojenia dohodneme emailom.', email: '', phone: '',
  cancellationHours: 24, paymentHours: 24, lateCancellation: 'refund', leadHours: 24, horizonDays: 60, bufferMinutes: 10, holdHours: 24, slotMinutes: 60, stripeEnabled: false, paymentMode: 'confirm_then_pay',
  hours: Array.from({ length: 7 }, (_, day) => ({ day, open: '09:00', close: '17:00', enabled: day > 0 && day < 6 })),
  services: [COACHING,
    { id: 'uvodne-stretnutie', name: 'Úvodné stretnutie', description: 'Zoznámime sa, prejdeme vaše očakávania a vyskúšame vedenú hypnotickú relaxáciu.', minutes: 60, price: 55, active: true },
    { id: 'hypnoticke-sedenie', name: 'Individuálna hypnóza', description: 'Vedené hypnotické techniky, predstavivosť a nácvik práce s pozornosťou.', minutes: 60, price: 50, active: true },
    { id: 'relaxacia', name: 'Hypnotická relaxácia', description: 'Priestor na spomalenie, uvoľnenie a nácvik relaxácie pre každodenný život.', minutes: 60, price: 65, active: true },
    { id: 'mentalny-trening', name: 'Mentálny tréning športovca', description: 'Práca s koncentráciou, vizualizáciou a prípravou na športový výkon.', minutes: 60, price: 45, active: true },
    { id: 'coaching', name: 'Coaching a osobný rozvoj', description: 'Praktická práca s cieľmi, každodennými návykmi a organizáciou času.', minutes: 60, price: 45, active: true },
  ].map(s => ({ ...s, minutes: 50, active:s.id===COACHING.id })),
};
export const requestSchema = z.object({
  serviceId: z.string().min(2).max(50), startsAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(100), email: z.email().max(254), phone: z.string().trim().max(40),
  adult: z.literal(true), accepted: z.literal(true), website: z.string().max(200).default(''),
  requestId: z.uuid(), legalVersion: z.literal(LEGAL_VERSION),
  topic: z.enum(COACHING_TOPICS.map(t => t.id) as [string, ...string[]]).default('zatial-neviem'),
  topicNote: z.string().trim().max(500).default(''),
  reservationMinutes:z.number().int().min(30).max(600).multipleOf(30).optional(),packageId:z.string().max(50).default(''),entitlementId:z.union([z.literal(''),z.uuid()]).default(''),
  participantName:z.string().trim().max(100).default(''),participantAge:z.number().int().min(0).max(120).default(0),guardianConsent:z.boolean().default(false),
});
export const clientBookingSchema = requestSchema.omit({ name: true, email: true, website: true }).extend({
  attributionConsent: z.literal('booking-attribution-v1').nullable().default(null),
  firstName:z.string().trim().min(1).max(60),lastName:z.string().trim().min(1).max(60),
  phone:z.string().trim().min(6).max(40).regex(/^[+\d\s().-]+$/).refine(v=>v.replace(/\D/g,'').length>=6),
  city:z.string().trim().min(2).max(100),
  country:z.string().trim().min(2).max(60).transform(v=>({sr:'SK',sk:'SK',slovensko:'SK','slovenská republika':'SK',cz:'CZ','čr':'CZ',česko:'CZ','česká republika':'CZ'}[v.toLowerCase()]||v)),
}).strict();
export type Appointment = {
  user_id?: string | null;
  service_id?: string;
  marketingSource?: import('@/lib/marketing-attribution').BookingSource | null;
  marketingSourceUnavailable?: boolean;
  marketingExcluded?: boolean;
  id: string; kind: 'booking' | 'block'; status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'completed' | 'no_show' | 'blocked';
  starts_at: string; ends_at: string; busy_until: string; hold_until: string | null;
  service_name: string; price: number; currency?:'eur'|'czk';locale?:'sk'|'cs'|'en'; customer_name: string | null; email: string | null; phone: string | null;
  customer_first_name?:string|null;customer_last_name?:string|null;customer_city?:string|null;customer_country?:string|null;
  paid: boolean; location: string; created_at: string;
  payment_due_at?: string | null; contract_at?: string | null; withdrawal_at?: string | null;
  payment_flow?: 'confirm_then_pay'|'authorize_confirm'; payment_state?: 'awaiting_checkout'|'authorized'|'capturing'|'captured'|'cancelling'|'released';
  funding_type?:'card'|'package'|'manual';entitlement_id?:string|null;package_offer_id?:string|null;package_snapshot?:{name:string;sessions:number;extras:string;creditMinutes?:number;validityMonths?:number}|null;participant_name?:string|null;participant_age?:number|null;guardian_consent_at?:string|null;
  authorization_expires_at?:string|null; meeting_url?:string|null; meeting_state?:'none'|'pending'|'ready'|'cancelling'|'cancelled';meeting_event_id?:string|null;
  early_service_consent?: boolean; checkout_terms_version?: string | null;
  payment_terms?: { version: string; currency?:'eur'|'czk';locale?:'sk'|'cs'|'en';minutes?:number;slotMinutes?:number;serviceName?:string;package?:{name:string;sessions:number;extras:string;creditMinutes?:number;validityMonths?:number}|null; paymentHours: number; cancellationHours: number; lateCancellation: 'refund'|'individual'; provider: string; companyId: string; registeredAddress: string; registration: string; email: string; phone: string } | null;
  topic?: string | null; topic_note?: string | null; stripe_session_id?: string | null; payment_intent_id?: string | null; payment_review?: boolean;
};
export const statusLabels: Record<Appointment['status'], string> = { pending: 'Čaká na potvrdenie', confirmed: 'Potvrdená', cancelled: 'Zrušená', expired: 'Vypršala', completed: 'Absolvovaná', no_show: 'Klient neprišiel', blocked: 'Blokovaný čas' };
export function money(value: number, currency?:string, locale:PortalLocale='sk') { const czk=currency?.toLowerCase()==='czk'||(!currency&&value>=1000);return new Intl.NumberFormat(localeTag(locale), { style: 'currency', currency: czk?'CZK':'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value); }
export function dateLabel(value: string, locale:'sk'|'cs'|'en'='sk') { return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(new Date(value)); }
export function localDate(value: Date) { return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value); }
