import 'server-only';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase-service';
import { ATTRIBUTION_COOKIE, INTERNAL_MARKETING_EXCLUSIONS, type BookingSource } from './marketing-attribution';
import { z } from 'zod';

export async function attachBookingSource(id: string, userId: string, consentVersion: string | null = null) {
  if (consentVersion !== 'booking-attribution-v1' || INTERNAL_MARKETING_EXCLUSIONS.includes(id)) return;
  try {
    const visitor = z.uuid().safeParse((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
    if (!visitor.success) return;
    // Marketing must never alter the result of an already saved reservation.
    await getServiceSupabase().rpc('marketing_attach_booking', { p_booking: id, p_user: userId, p_visitor: visitor.data }).abortSignal(AbortSignal.timeout(1500));
  } catch { /* An unavailable optional metric never blocks the reservation. */ }
}
export async function adminBookingSources(ids: string[]) {
  const sources: Record<string, BookingSource> = {};
  if (!ids.length) return { sources, unavailable: false };
  try {
    const { data, error } = await getServiceSupabase().rpc('marketing_booking_details', { p_ids: [...new Set(ids)].slice(0,700), p_excluded: INTERNAL_MARKETING_EXCLUSIONS });
    if (error) return { sources, unavailable: true };
    for (const row of data || []) sources[row.appointment_id] = { campaign_id: row.campaign_id, ad_name: row.ad_name, campaign_name: row.campaign_name, source: row.source, is_test: row.is_test };
    return { sources, unavailable: false };
  } catch { return { sources, unavailable: true }; }
}
export async function purgeAttribution() {
  try { await getServiceSupabase().rpc('marketing_purge'); }
  catch { /* Optional maintenance must not interrupt payment/email processing. */ }
}
