import {z} from 'zod';

export const timeWindows = [
  {id: 'morning', sk: 'Dopoludnia', cs: 'Dopoledne', hours: '9:00–12:00'},
  {id: 'afternoon', sk: 'Popoludní', cs: 'Odpoledne', hours: '13:00–16:00'},
  {id: 'evening', sk: 'Podvečer', cs: 'Podvečer', hours: '17:00–19:00'},
] as const;
export const timeRequestStates = {new: 'Nová', contacted: 'Kontaktovaný klient', resolved: 'Vybavená', closed: 'Uzavretá'};
export const timeRequestSchema = z.object({
  requestId: z.uuid(), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  phone: z.string().trim().min(7).max(40).regex(/^[+\d\s().-]+$/).refine(s => {const n=s.replace(/\D/g, '').length; return n>=7 && n<=15;}),
  windows: z.array(z.enum(['morning', 'afternoon', 'evening'])).min(1).max(3).refine(v => new Set(v).size===v.length),
  note: z.string().trim().max(1500).default(''), serviceId: z.string().regex(/^[a-z0-9-]*$/).max(100).default(''),
  locale: z.enum(['sk', 'cs','en']).default('sk'), website: z.string().max(100).default(''),
}).strict();
export type TimeRequest = {id:string; first_name:string; last_name:string; email:string; phone:string; time_windows:string[]; note:string; service_name:string; locale:'sk'|'cs'|'en'; state:keyof typeof timeRequestStates; revision:number; created_at:string};
