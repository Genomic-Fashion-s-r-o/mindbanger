import 'server-only';
import { importPKCS8, SignJWT } from 'jose';
import { getServiceSupabase } from '@/lib/supabase-service';
import { ADMIN_EMAILS } from '@/lib/booking/admin';
import { fcmFailure, pushContents } from './model';

type Job = { id: string; lease: string; attempts: number; eventId: string; kind: 'booking' | 'interest'; deviceId: string; userId: string; token: string; enabled: boolean };
const env = (name: string) => process.env['ADMIN_MOBILE_FIREBASE_' + name];
export function mobileFirebaseConfig() {
  const projectId = env('PROJECT_ID'), applicationId = env('APP_ID'), apiKey = env('API_KEY'), senderId = env('SENDER_ID');
  return projectId && applicationId && apiKey && senderId ? { projectId, applicationId, apiKey, senderId } : null;
}
export function mobilePushReady() { return !!(mobileFirebaseConfig() && env('CLIENT_EMAIL') && env('PRIVATE_KEY')); }

let accessToken: { value: string; expires: number } | undefined;
async function firebaseAccessToken() {
  if (accessToken && accessToken.expires > Date.now() + 60000) return accessToken.value;
  const key = await importPKCS8(env('PRIVATE_KEY')!.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer(env('CLIENT_EMAIL')!).setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt().setExpirationTime('5m').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error('firebase_auth_unavailable');
  const result = await response.json();
  if (typeof result.access_token !== 'string') throw Error('firebase_auth_unavailable');
  accessToken = { value: result.access_token, expires: Date.now() + Math.min(3600, Number(result.expires_in) || 300) * 1000 };
  return accessToken.value;
}

export async function sendMobilePush(job: Pick<Job, 'kind' | 'eventId' | 'token'>) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env('PROJECT_ID')!)}/messages:send`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + await firebaseAccessToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token: job.token, data: pushContents(job.kind, job.eventId), android: { priority: 'high', ttl: '86400s' } } }),
    signal: AbortSignal.timeout(12000),
  });
  if (response.ok) return 'sent' as const;
  if (response.status === 401) accessToken = undefined;
  return fcmFailure(response.status, await response.json().catch(() => ({})));
}

export async function processMobilePush() {
  // Do not claim jobs until credentials exist: setup must not consume retries.
  if (!mobilePushReady()) return { configured: false, sent: 0, failed: 0 };
  const db = getServiceSupabase();
  const { data, error } = await db.rpc('admin_mobile_claim', { p_limit: 5 });
  if (error) throw Error('mobile_queue_unavailable');
  const allowedUsers = new Map<string, Promise<boolean>>();
  let sent = 0, failed = 0;
  await Promise.all(((data || []) as Job[]).map(async job => {
    let result: 'sent' | 'retry' | 'failed' | 'skipped' = 'retry';
    let code: string | null = null;
    try {
      if (!allowedUsers.has(job.userId)) {
        allowedUsers.set(job.userId, (async () => {
          const { data: user, error: userError } = await db.auth.admin.getUserById(job.userId);
          if (userError) throw Error('admin_verification_unavailable');
          return ADMIN_EMAILS.includes(user.user?.email?.toLowerCase() || '');
        })());
      }
      // Re-read preferences to respect logout/disable after claiming a batch.
      const current = await db.from('admin_mobile_devices').select('token,bookings,interests').eq('id', job.deviceId).eq('user_id', job.userId).maybeSingle();
      if (current.error) throw Error('device_unavailable');
      if (!await allowedUsers.get(job.userId) || !current.data || !(job.kind === 'booking' ? current.data.bookings : current.data.interests)) result = 'skipped';
      else {
        const outcome = await sendMobilePush({ ...job, token: current.data.token });
        if (outcome === 'invalid-token') {
          // A rotated token must never be removed on a stale provider response.
          const removed = await db.from('admin_mobile_devices').delete().eq('id', job.deviceId).eq('token', current.data.token).select('id');
          if (removed.error) throw Error('device_cleanup_unavailable');
          result = removed.data?.length ? 'skipped' : 'retry'; code = removed.data?.length ? 'unregistered' : 'token_rotated';
        } else { result = outcome; if (outcome !== 'sent') code = 'provider_' + outcome; }
      }
    } catch { result = 'retry'; code = 'provider_unavailable'; }
    const finished = await db.rpc('admin_mobile_finish', { p_id: job.id, p_lease: job.lease, p_result: result, p_error: code });
    if (finished.error) throw Error('mobile_queue_finish_unavailable');
    if (result === 'sent') sent++; else if (result !== 'skipped') failed++;
  }));
  return { configured: true, sent, failed };
}

// Optional side effect; existing reservations/registrations must succeed even if FCM fails.
export async function tryMobilePush() {
  try { await processMobilePush(); } catch { console.warn('admin_mobile_push_pending'); }
}
