import 'server-only';
import {getServiceSupabase} from './supabase-service';
import {renderWelcomeEmail} from './program-welcome-content';

type WelcomeJob = {id: string; interestId: string; lease: string; email: string; token: string};
type WelcomeState = 'queued' | 'sent' | 'failed' | 'review' | 'skipped';

async function deliverWelcome(job: WelcomeJob): Promise<WelcomeState> {
  const db = getServiceSupabase();
  let state: WelcomeState = 'review', provider: string | null = null, code: string | null = null;
  let attempted = false;
  try {
    const recipient = await db.from('program_interest').select('state,consent_version').eq('id', job.interestId).maybeSingle();
    if (recipient.error) throw Error('recipient_check_unavailable');
    if (recipient.data?.state !== 'confirmed' || recipient.data.consent_version !== 'sugar-interest-genomic-2026-10-21') {
      state = 'skipped'; code = 'recipient_removed';
    } else {
      const content = renderWelcomeEmail('https://www.mindbanger.com/produkty/chut-na-sladke/potvrdenie?odhlasit=' + job.token);
      attempted = true;
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json', idempotencyKey: job.id},
        body: JSON.stringify({sender: {name: 'Miroslav Jobus | Mindbanger', email: process.env.BOOKING_FROM_EMAIL || 'miroslav@mindbanger.com'},
          to: [{email: job.email}], replyTo: {email: 'miroslav@mindbanger.com'}, headers: {idempotencyKey: job.id},
          subject: content.subject, htmlContent: content.html, textContent: content.text, tags: ['sugar-interest-welcome']}),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        code = 'brevo_http_' + response.status;
        state = response.status === 429 ? 'queued' : response.status >= 400 && response.status < 500 ? 'failed' : 'review';
      } else {
        const result = await response.json();
        if (typeof result.messageId !== 'string' || !result.messageId) throw Error('provider_result_uncertain');
        provider = result.messageId; state = 'sent';
      }
    }
  } catch {
    state = attempted ? 'review' : 'queued';
    code = attempted ? 'delivery_uncertain_check_brevo' : 'recipient_check_unavailable';
  }
  const finish = await db.rpc('program_welcome_finish', {p_id: job.id, p_lease: job.lease, p_state: state, p_provider: provider, p_error: code});
  if (finish.error) throw Error('welcome_result_unavailable');
  if (state === 'failed' || state === 'review') console.warn('program_welcome_delivery', {state, code});
  return state;
}

export async function processProgramWelcome(interestId?: string) {
  if (!process.env.BREVO_API_KEY) return {processed: 0};
  const {data, error} = await getServiceSupabase().rpc('program_welcome_claim', {p_interest: interestId || null, p_limit: interestId ? 1 : 10});
  if (error) throw Error('welcome_queue_unavailable');
  const results = await Promise.allSettled(((data || []) as WelcomeJob[]).map(deliverWelcome));
  if (results.some(result => result.status === 'rejected')) throw Error('welcome_result_unavailable');
  return {processed: results.length};
}
