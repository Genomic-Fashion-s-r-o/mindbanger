import {portalLocale} from '@/lib/portal-locale-server';
import {portalPath} from '@/lib/portal-locale';
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { CLIENT_TERMS_VERSION, safeClientReturn } from '@/lib/client-platform';

export const getClientContext = cache(async () => {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  const [{ data: profile, error: profileError }, { data: consent, error: consentError }] = await Promise.all([
    db.from('profiles').select('full_name,preferred_language,timezone,birth_year').eq('id', user.id).maybeSingle(),
    getServiceSupabase().from('client_consents').select('version').eq('user_id', user.id).eq('version', CLIENT_TERMS_VERSION).maybeSingle(),
  ]);
  if (profileError || consentError) throw new Error('Klientsky účet je dočasne nedostupný.');
  return { user, profile, accepted: !!consent };
});
export async function requireClient() {
  const context = await getClientContext();
  if (!context) redirect(portalPath('/prihlasenie',await portalLocale())+'?next=' + encodeURIComponent(safeClientReturn((await headers()).get('x-client-return'))));
  return context;
}
export async function clientAppointments(userId: string, history = false) {
  let query = getServiceSupabase().from('appointments')
    .select('id,starts_at,ends_at,service_id,service_name,status,hold_until,location,price,currency,locale,paid,topic,payment_review,payment_due_at,payment_terms,contract_at,withdrawal_at,payment_flow,payment_state,authorization_expires_at,meeting_url,meeting_state,busy_until,funding_type,entitlement_id,package_offer_id,package_snapshot,participant_name,participant_age,guardian_consent_at').eq('user_id', userId).eq('kind','booking');
  if(!history) query=query.in('status',['pending','confirmed']).gte('starts_at',new Date().toISOString());
  const {data,error}=await query.order('starts_at',{ascending:!history}).limit(100);
  if (error) throw new Error('Termíny sa nepodarilo načítať.');
  const rows=(data||[]).map(a=>({...a,status:a.status==='pending'&&a.hold_until&&Date.parse(a.hold_until)<=Date.now()?'expired':a.status}));
  return history?rows:rows.filter(a=>a.status!=='expired');
}
