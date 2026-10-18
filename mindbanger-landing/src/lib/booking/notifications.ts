import 'server-only';
import { getServiceSupabase } from '@/lib/supabase-service';
import { Appointment, dateLabel, money } from './model';
type MailJob = { id: string; appointment_id: string; event: string; audience: string; attempts: number; payload: Appointment & { manageUrl?: string; contactEmail: string; contactPhone: string } };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const titles: Record<string, string> = { requested: 'Žiadosť o termín bola prijatá', confirmed: 'Váš termín je potvrdený', cancelled: 'Termín bol zrušený', moved: 'Váš termín bol presunutý', expired: 'Žiadosť o termín vypršala', reminder: 'Pripomienka vášho stretnutia' };
export async function processBookingMail() {
  const db = getServiceSupabase();
  const { data, error } = await db.rpc('appointment_claim_mail', { p_limit: 10 });
  if (error) throw new Error('Mail queue unavailable');
  let sent = 0, failed = 0;
  await Promise.all(((data || []) as MailJob[]).map(async job => {
    try {
      const b = job.payload;
      if (job.event === 'reminder') {
        const { data: current } = await db.from('appointments').select('status,starts_at').eq('id', job.appointment_id).single();
        if (!current || current.status !== 'confirmed' || Date.parse(current.starts_at) !== Date.parse(b.starts_at) || Date.parse(b.starts_at) <= Date.now()) {
          await db.from('appointment_mail').update({ state: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id); return;
        }
      }
      const owner = job.audience === 'owner';
      const subject = owner ? (job.event === 'requested' ? 'Nová žiadosť o termín' : 'Klient zrušil termín') : titles[job.event];
      const recipient = owner ? b.contactEmail : b.email;
      if (!recipient || !process.env.BREVO_API_KEY) throw new Error('Email is not configured');
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#25473d;line-height:1.7"><h1 style="font-size:24px">${escape(subject)}</h1><p>${escape(b.service_name)} · ${escape(dateLabel(b.starts_at))}</p><p>${escape(b.location)}<br>Cena služby: ${escape(money(Number(b.price)))}</p>${owner ? `<p>Klient: ${escape(b.customer_name || '')}<br>Email: ${escape(b.email || '')}<br>Telefón: ${escape(b.phone || '')}</p>` : `<p>${job.event === 'requested' ? 'Toto je prijatie nezáväznej žiadosti. Počkajte na osobné potvrdenie termínu. Ak žiadosť nebude potvrdená včas, blokovanie termínu automaticky vyprší.' : job.event === 'expired' ? 'Žiadosť nebola potvrdená v čase jej platnosti. Môžete si vybrať nový termín.' : 'Online rezervácia aj jej zrušenie sú bezplatné. Službu a úhradu dohodneme osobne pred stretnutím.'}</p>`}${b.manageUrl && !owner ? `<p><a href="${escape(b.manageUrl)}">Zobraziť alebo zrušiť žiadosť</a></p><p>Tento súkromný odkaz nepreposielajte.</p>` : ''}<p>Kontakt: ${escape(b.contactEmail)} · ${escape(b.contactPhone)}</p><p style="font-size:12px">Mgr. Miroslav Jobus · Hypnóza a mentálny tréning. Služby majú nezdravotnícky charakter.</p></div>`;
      const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: { name: 'Mgr. Miroslav Jobus', email: process.env.BOOKING_FROM_EMAIL || 'hello@mindbanger.com' }, to: [{ email: recipient }], replyTo: { email: b.contactEmail }, subject, htmlContent: html }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Email provider failed');
      const { error: saveError } = await db.from('appointment_mail').update({ state: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id);
      if (saveError) throw saveError;
      sent++;
    } catch {
      failed++;
      await db.from('appointment_mail').update({ state: job.attempts >= 5 ? 'failed' : 'queued', available_at: new Date(Date.now() + Math.min(60, job.attempts * 10) * 60000).toISOString() }).eq('id', job.id);
    }
  }));
  return { sent, failed };
}
