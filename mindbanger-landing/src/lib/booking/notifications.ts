import 'server-only';
import { createHash } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase-service';
import { Appointment } from './model';
import { bookingEmail } from './email-content';
import { tryMobilePush } from '@/lib/admin-mobile/push';
type MailJob = { id: string; appointment_id: string; event: string; audience: string; attempts: number; payload: Appointment & { manageUrl?: string; contactEmail: string; contactPhone: string } };
export async function processBookingMail() {
  const db = getServiceSupabase();
  const { data, error } = await db.rpc('appointment_claim_mail', { p_limit: 10 });
  if (error) throw new Error('Mail queue unavailable');
  let sent = 0, failed = 0;
  await Promise.all(((data || []) as MailJob[]).map(async job => {
    try {
      const b = job.payload;
      if (b.funding_type === 'manual' && ['confirmed','reminder'].includes(job.event)) {
        const current = await db.from('appointments').select('status,starts_at,meeting_state,meeting_url').eq('id', job.appointment_id).single();
        if (current.error) throw Error('Manual booking unavailable');
        if (current.data.status !== 'confirmed' || current.data.meeting_state !== 'ready' || current.data.meeting_url !== b.meeting_url || Date.parse(current.data.starts_at) !== Date.parse(b.starts_at)) {
          await db.from('appointment_mail').update({ state: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id); return;
        }
      }
      if (job.event === 'reminder') {
        const { data: current } = await db.from('appointments').select('status,starts_at').eq('id', job.appointment_id).single();
        if (!current || current.status !== 'confirmed' || Date.parse(current.starts_at) !== Date.parse(b.starts_at) || Date.parse(b.starts_at) <= Date.now()) {
          await db.from('appointment_mail').update({ state: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id); return;
        }
      }
      const owner = job.audience === 'owner';
      const recipient=owner?b.contactEmail:b.email;
      if(!recipient||!process.env.BREVO_API_KEY)throw new Error('Email is not configured');
      const rendered=bookingEmail(b,job.event,owner);
      const h=createHash('sha256').update('mindbanger-manual-mail:'+job.id).digest('hex');
      const manualKey=[h.slice(0,8),h.slice(8,12),'5'+h.slice(13,16),'8'+h.slice(17,20),h.slice(20,32)].join('-');
      const subject=rendered.subject;
      const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://www.mindbanger.com').origin;
      const html=rendered.html.replace(/href="(\/[^"]*)"/g,(_,path)=>'href="'+origin+path+'"');
      const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', ...(b.funding_type==='manual'?{idempotencyKey:manualKey}:{}) }, body: JSON.stringify({ sender: { name: 'Mgr. Miroslav Jobus', email: process.env.BOOKING_FROM_EMAIL || 'miroslav@mindbanger.com' }, to: [{ email: recipient }], replyTo: { email: b.contactEmail }, subject, htmlContent: html, ...(b.funding_type==='manual'?{headers:{idempotencyKey:manualKey}}:{}) }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Email provider failed');
      const { error: saveError } = await db.from('appointment_mail').update({ state: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id);
      if (saveError) throw saveError;
      sent++;
    } catch {
      failed++;
      await db.from('appointment_mail').update({ state: job.attempts >= 5 ? 'failed' : 'queued', available_at: new Date(Date.now() + Math.min(60, job.attempts * 10) * 60000).toISOString() }).eq('id', job.id);
    }
  }));
  await tryMobilePush();
  return { sent, failed };
}
