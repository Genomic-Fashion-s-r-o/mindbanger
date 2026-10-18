import 'server-only';
import { cache } from 'react';
import { createHash, randomBytes } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase-service';
import { BookingSettings, DEFAULT_SETTINGS, settingsSchema } from './model';

export const getBookingSettings = cache(async (): Promise<{ settings: BookingSettings; installed: boolean }> => {
  try {
    const db = getServiceSupabase();
    const { data, error } = await db.from('appointment_settings').select('config').eq('id', 1).single();
    if (error) return { settings: DEFAULT_SETTINGS, installed: false };
    const parsed = settingsSchema.safeParse(data.config);
    return { settings: parsed.success ? parsed.data : DEFAULT_SETTINGS, installed: true };
  } catch { return { settings: DEFAULT_SETTINGS, installed: false }; }
});
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
  if (error?.code === '23P01' || error?.message?.includes('slot_unavailable')) return { error: 'Tento termín už nie je dostupný. Vyberte iný.', status: 409 };
  if (error?.message?.includes('booking_disabled')) return { error: 'Online rezervácie sú momentálne vypnuté.', status: 503 };
  if (error?.message?.includes('invalid_slot')) return { error: 'Termín nie je v ponuke. Vyberte ho znova z kalendára.', status: 400 };
  if (error?.message?.includes('invalid_transition')) return { error: 'Rezervácia sa medzičasom zmenila. Obnovte prehľad.', status: 409 };
  return { error: 'Požiadavku sa nepodarilo uložiť. Skúste to neskôr.', status: 503 };
}
