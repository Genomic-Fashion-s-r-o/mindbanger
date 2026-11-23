import 'server-only';
import { cache } from 'react';
import { createHash, randomBytes } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase-service';
import { BookingSettings, DEFAULT_SETTINGS, settingsSchema, normalizeCoachingSettings } from './model';
import { SERVICE_CATALOG,PACKAGE_CATALOG,orderedServices } from './catalog';
import { localizeSettings } from '@/lib/site-locale';
import { siteLocale } from '@/lib/site-locale-server';

export const getBookingSettings = cache(async (): Promise<{ settings: BookingSettings; installed: boolean }> => {
  try {
    const db = getServiceSupabase();
    const { data, error } = await db.from('appointment_settings').select('config').eq('id', 1).single();
    if (error) return { settings: DEFAULT_SETTINGS, installed: false };
    const config=process.env.BOOKING_CATALOG_PREVIEW==='1'?{...data.config,catalogVersion:2,slotMinutes:30,bufferMinutes:10,services:SERVICE_CATALOG,packages:PACKAGE_CATALOG}:normalizeCoachingSettings(data.config);
    const parsed = settingsSchema.safeParse(config);
    return { settings: parsed.success ? {...parsed.data,services:orderedServices(parsed.data.services)} : DEFAULT_SETTINGS, installed: true };
  } catch { return { settings: DEFAULT_SETTINGS, installed: false }; }
});
export async function getLocalizedBookingSettings(){
  const [{settings,installed},locale]=await Promise.all([getBookingSettings(),siteLocale()]);
  return {settings:localizeSettings(settings,locale),installed,locale};
}
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function managementToken() { return randomBytes(32).toString('hex'); }
export function siteOrigin() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) throw new Error('Chýba NEXT_PUBLIC_SITE_URL.');
  return new URL(origin).origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}
export function publicError(error: { code?: string; message?: string } | null) {
  if(error?.message?.includes('guardian_required'))return {error:'Pre neplnoletého teenagera od 13 rokov musí rezervovať zákonný zástupca a potvrdiť súhlas s účasťou.',status:400};
  if(error?.message?.includes('package_expired'))return {error:'Kredit už nie je platný pre tento termín. Vyber termín v platnosti balíka.',status:409};
  if(error?.message?.includes('package_exhausted')||error?.message?.includes('package_unavailable')||error?.message?.includes('package_participant_mismatch'))return {error:'Balík nemá dostatok voľného času alebo nezodpovedá účastníkovi. Obnov zostatok vo svojom účte.',status:409};
  if(error?.message?.includes('invalid_package')||error?.message?.includes('invalid_service'))return {error:'Vyber aktívnu službu alebo balíček.',status:400};
  if (error?.code === '23P01' || error?.message?.includes('slot_unavailable')) return { error: 'Tento termín už nie je dostupný. Vyberte iný.', status: 409 };
  if (error?.message?.includes('booking_disabled')) return { error: 'Online rezervácie sú momentálne vypnuté.', status: 503 };
  if (error?.message?.includes('invalid_slot')) return { error: 'Termín nie je v ponuke. Vyberte ho znova z kalendára.', status: 400 };
  if (error?.message?.includes('confirmation_too_late')) return { error: 'Termín potvrďte viac než hodinu pred začiatkom; pri presune musí zostať čas na úhradu.', status: 409 };
  if (error?.message?.includes('checkout_move_requires_cancel')) return { error: 'Pre tento neuhradený termín už existuje platobná stránka. Najprv dohodnite zrušenie a nový termín; pôvodnú úhradu preveríte v Stripe.', status: 409 };
  if (error?.message?.includes('payment_terms_missing')) return { error: 'Historický termín nemá nové platobné podmienky. Dohodnite novú žiadosť s klientom.', status: 409 };
  if (error?.message?.includes('invalid_transition')) return { error: 'Rezervácia sa medzičasom zmenila. Obnovte prehľad.', status: 409 };
  return { error: 'Požiadavku sa nepodarilo uložiť. Skúste to neskôr.', status: 503 };
}
