import { getServiceSupabase } from '@/lib/supabase-service';

// Called only by the server proxy. No browser beacon, public write API or per-visitor record.
export async function countSiteRequest(path: string): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') return;
  try {
    const db = getServiceSupabase();
    const { error } = await db.rpc('site_request_increment', { p_path: path }).abortSignal(AbortSignal.timeout(2500));
    if (error) console.warn('site_request_counter_unavailable');
  } catch {
    // Failure must never block a visitor or log the incoming request/identifiers.
    console.warn('site_request_counter_unavailable');
  }
}

// Runs from the authenticated maintenance cron even when nobody visits the site.
export async function purgeSiteRequestTotals(): Promise<void> {
  try {
    const { error } = await getServiceSupabase().rpc('site_request_purge').abortSignal(AbortSignal.timeout(2500));
    if (error) console.warn('site_request_retention_unavailable');
  } catch { console.warn('site_request_retention_unavailable'); }
}
