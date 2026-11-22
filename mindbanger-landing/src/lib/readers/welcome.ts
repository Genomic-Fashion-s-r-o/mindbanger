import 'server-only';
import { getServiceSupabase } from '@/lib/supabase-service';
import { ownsEmail, result } from './store';
import { sendWelcomeEmail } from './welcome-email';

export async function processReaderWelcomes(userId?: string) {
  // Without configured delivery, leave queued welcomes intact for a later cron run.
  if (!process.env.BREVO_API_KEY) return { welcomes: 0 };
  const db = getServiceSupabase(); let processed = 0;
  while (processed < (userId ? 1 : 3)) {
    const delivery = result(await db.rpc('reader_welcome_claim', { p_user: userId || null })) as { id: string; user_id: string; locale: string } | null;
    if (!delivery) break;
    let saved: { state: string; provider_id?: string; content_locale?: string; content_version?: string; sent_at?: string } = { state: 'review' };
    try {
      const [preferences, identity] = await Promise.all([db.from('reader_preferences').select('suppressed').eq('user_id', delivery.user_id).maybeSingle(), db.auth.admin.getUserById(delivery.user_id)]);
      if (identity.error || preferences.error) throw Error('Welcome recipient unavailable');
      const user = identity.data.user, prefs = result(preferences);
      if (!user?.email || !ownsEmail(user) || !prefs || prefs.suppressed) saved = { state: 'skipped' };
      else {
        const sent = await sendWelcomeEmail({ deliveryId: delivery.id, email: user.email, locale: delivery.locale }, { apiKey: process.env.BREVO_API_KEY, siteOrigin: process.env.NEXT_PUBLIC_SITE_URL });
        saved = { state: sent.state, provider_id: sent.providerId, content_locale: sent.language, content_version: sent.version, ...(sent.state === 'sent' ? { sent_at: new Date().toISOString() } : {}) };
      }
    } catch { /* Leave uncertain outcomes for review; registration remains successful. */ }
    result(await db.from('reader_welcome_deliveries').update(saved).eq('id', delivery.id).eq('state', 'processing'));
    processed++;
  }
  return { welcomes: processed };
}
