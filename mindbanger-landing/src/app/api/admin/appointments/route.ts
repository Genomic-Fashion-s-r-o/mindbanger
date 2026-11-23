import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { getBookingSettings, sameOrigin, publicError, managementToken, siteOrigin, tokenHash } from '@/lib/booking/store';
import { settingsSchema, requestSchema, BOOKING_PAYMENTS_ENABLED } from '@/lib/booking/model';
import { processBookingMail } from '@/lib/booking/notifications';
import { plannerSchema } from '@/lib/booking/planner';
import { calendarSlots, weekDates } from '@/lib/booking/admin-calendar';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';
import { COACHING_TOPICS } from '@/lib/booking/offer';
import type { Appointment } from '@/lib/booking/model';
import { stripeReadiness } from '@/lib/booking/stripe-readiness';
import { coachingStripe } from '@/lib/booking/stripe-client';
import { captureAppointment, reconcileAuthorizations } from '@/lib/booking/authorization';
import { processVideoJobs } from '@/lib/booking/video-jobs';
import { processDocumentJobs } from '@/lib/booking/documents';
import { videoReadiness } from '@/lib/booking/video-readiness';
import { adminBookingSources } from '@/lib/marketing-attribution-server';
import { INTERNAL_MARKETING_EXCLUSIONS } from '@/lib/marketing-attribution';
export const dynamic = 'force-dynamic';
const changeSchema = z.object({ action: z.enum(['confirm','cancel','complete','no_show','paid','move']), id: z.uuid(), startsAt: z.iso.datetime({ offset: true }).optional() });
const blockSchema = z.object({ action: z.literal('block'), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), label: z.string().trim().min(2).max(100) });
const assignSchema = z.object({ action: z.literal('assign'), serviceId:z.string().min(2).max(50).default('individualny-coaching'),participantName:z.string().trim().max(100).default(''),participantAge:z.number().int().min(0).max(17).default(0),guardianConsent:z.boolean().default(false), userId: z.uuid(), startsAt: z.iso.datetime({ offset: true }), topic: z.enum(COACHING_TOPICS.map(t => t.id) as [string, ...string[]]), note: z.string().trim().max(500), requestId: z.uuid(), confirmed: z.boolean(), adult: z.literal(true), accepted: z.literal(true), legalVersion: requestSchema.shape.legalVersion }).strict();
export async function GET(request: Request) {
  if (!(await bookingAdmin())) return NextResponse.json({ error: 'Prihláste sa ako admin a overte druhý faktor na hlavnom paneli.' }, { status: 401 });
  const { settings, installed } = await getBookingSettings();
  if (!installed) return NextResponse.json({ settings, installed, bookings: [], failedMail: 0, queuedMail: 0 });
  const day = new URL(request.url).searchParams.get('day');
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(`${day}T00:00:00Z`))) return NextResponse.json({ error: 'Vyberte dátum.' }, { status: 400 });
  const start = Date.parse(`${day}T00:00:00Z`) - 3 * 3600000, end = start + 8 * 86400000;
  const db = getServiceSupabase();
  const [bookings, failed, queued, pending] = await Promise.all([
    db.from('appointments').select('id,user_id,service_id,kind,status,starts_at,ends_at,busy_until,hold_until,service_name,price,location,customer_name,email,phone,paid,created_at,topic,topic_note,payment_review,payment_due_at,contract_at,withdrawal_at,payment_flow,payment_state,authorization_expires_at,meeting_url,meeting_state,funding_type,entitlement_id,package_offer_id,package_snapshot,participant_name,participant_age,guardian_consent_at').gte('busy_until', new Date(start).toISOString()).lt('starts_at', new Date(end).toISOString()).order('starts_at').limit(500),
    db.from('appointment_mail').select('id', { count: 'exact', head: true }).eq('state','failed'),
    db.from('appointment_mail').select('id', { count: 'exact', head: true }).in('state',['queued','sending']),
    db.from('appointments').select('id,customer_name,email,phone,customer_city,customer_country,participant_name,participant_age,guardian_consent_at,service_name,topic,starts_at,price,status,payment_flow,payment_state,authorization_expires_at,hold_until,funding_type,stripe_session_id').eq('kind','booking').eq('status','pending').gt('starts_at',new Date().toISOString()).order('starts_at').limit(201),
  ]);
  if (bookings.error || failed.error || queued.error || pending.error) return NextResponse.json({ error: 'Kalendár sa nepodarilo načítať.' }, { status: 503 });
  const rows = (bookings.data || []) as Appointment[];
  const pendingBookings = [];
  const pendingRows = pending.data?.slice(0,200)||[];
  const attribution = await adminBookingSources([...rows.map(b=>b.id),...pendingRows.map(b=>b.id)]);
  const withSource = <T extends {id:string}>(row:T) => ({...row,marketingSource:attribution.sources[row.id]||null,marketingSourceUnavailable:attribution.unavailable,marketingExcluded:INTERNAL_MARKETING_EXCLUSIONS.includes(row.id)});
  // Read only the payer's contact/address fields; never return Stripe session IDs or card details.
  for(let offset=0;offset<pendingRows.length;offset+=5){
    pendingBookings.push(...await Promise.all(pendingRows.slice(offset,offset+5).map(async row=>{
      const {stripe_session_id,...booking}=row;
      if((booking.customer_city&&booking.customer_country)||!stripe_session_id||!['authorized','capturing'].includes(booking.payment_state||''))return {...booking,city:booking.customer_city,country:booking.customer_country};
      try{const session=await coachingStripe().checkout.sessions.retrieve(stripe_session_id);const details=session.customer_details;return {...booking,phone:booking.phone||details?.phone||null,city:booking.customer_city||details?.address?.city||null,country:booking.customer_country||details?.address?.country||null};}
      catch{return {...booking,city:booking.customer_city,country:booking.customer_country,billing_unavailable:true};}
    })));
  }
  return NextResponse.json({ settings, installed, bookings: rows.map(withSource), pendingBookings:pendingBookings.map(withSource), pendingTruncated: (pending.data?.length||0)>200, slots: Object.fromEntries(weekDates(day).map(date => [date, calendarSlots(settings, date, rows)])), failedMail: failed.count, queuedMail: queued.count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 403 });
  const user = await bookingAdmin();
  if (!user) return NextResponse.json({ error: 'Vyžaduje sa admin s overeným druhým faktorom.' }, { status: 401 });
  try {
    if (Number(request.headers.get('content-length')) > 262144) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413 });
    const body = await request.json();
    if (body.action === 'paid' && !BOOKING_PAYMENTS_ENABLED) return NextResponse.json({ error: 'Platobné funkcie sú vypnuté.' }, { status: 409 });
    const db = getServiceSupabase();
    if(body.action==='restore_credit'){const id=z.uuid().safeParse(body.id);if(!id.success)return NextResponse.json({error:'Neplatný termín.'},{status:400});const result=await db.rpc('appointment_release_credit',{p_id:id.data,p_actor:user.email});if(result.error)return NextResponse.json({error:'Sedenie nie je v stave individuálneho posúdenia.'},{status:409});}
    else if (body.action === 'assign') {
      const input = assignSchema.safeParse(body);
      if (!input.success) return NextResponse.json({ error: 'Vyberte registrovaného klienta, termín a potvrďte dohodu s dospelým klientom.' }, { status: 400 });
      const b = input.data, token = managementToken();
      const { error } = await db.rpc('appointment_admin_catalog', {p_service:b.serviceId,p_participant:b.participantName,p_age:b.participantAge,p_guardian:b.guardianConsent,p_user: b.userId, p_start: b.startsAt, p_topic: b.topic, p_note: b.note, p_request_id: b.requestId, p_hash: tokenHash(token), p_manage_url: `${siteOrigin()}/rezervacia/sprava#${token}`, p_legal_version: b.legalVersion, p_client_version: CLIENT_TERMS_VERSION, p_actor: user.email });
      if (error?.message?.includes('client_account_required')) return NextResponse.json({ error: 'Klient musí mať overený email a dokončený účet.' }, { status: 409 });
      if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    } else if (body.action === 'disable_slot') {
      const input = z.object({ startsAt: z.iso.datetime({ offset: true }) }).safeParse(body);
      if (!input.success) return NextResponse.json({ error: 'Vyberte voľný termín.' }, { status: 400 });
      const { error } = await db.rpc('appointment_disable_slot', { p_start: input.data.startsAt, p_actor: user.email });
      if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    } else if (body.action === 'schedule') {
      const input = z.object({ planner: plannerSchema, expected: plannerSchema.nullable() }).safeParse(body);
      if (!input.success) return NextResponse.json({ error: input.error.issues[0].message }, { status: 400 });
      const { error } = await db.rpc('appointment_save_planner', { p_planner: input.data.planner, p_expected: input.data.expected, p_actor: user.email });
      if (error?.message?.includes('schedule_changed')) return NextResponse.json({ error: 'Rozvrh medzičasom zmenil iný správca. Pred ďalšou úpravou obnovte stránku.' }, { status: 409 });
      if (error) throw error;
    } else if (body.action === 'settings') {
      const config = settingsSchema.safeParse(body.settings);
      if (!config.success) return NextResponse.json({ error: config.error.issues[0].message }, { status: 400 });
      if (config.data.enabled && (!process.env.BREVO_API_KEY || !process.env.CRON_SECRET || !process.env.NEXT_PUBLIC_SITE_URL)) return NextResponse.json({ error: 'Pred zapnutím nastavte BREVO_API_KEY, CRON_SECRET a NEXT_PUBLIC_SITE_URL v prostredí servera.' }, { status: 400 });
      if(config.data.stripeEnabled && (!process.env.COACHING_STRIPE_SECRET_KEY || !process.env.COACHING_STRIPE_WEBHOOK_SECRET || (process.env.VERCEL_ENV==='production'&&!/^(sk|rk)_live_/.test(process.env.COACHING_STRIPE_SECRET_KEY)))) return NextResponse.json({error:'Pred povolením platieb overte Stripe účet, správne kľúče a webhook. Produkcia vyžaduje live režim.'},{status:400});
      if (config.data.stripeEnabled && process.env.VERCEL_ENV === 'production' && !(await stripeReadiness(config.data.paymentMode)).ready) return NextResponse.json({ error: 'Stripe ešte nie je pripravené pre Milkam s.r.o. Použite kontrolu Stripe v nastaveniach; overte účet, príjem platieb a webhook.' }, { status: 400 });
      if(config.data.enabled&&config.data.paymentMode==='authorize_confirm'&&!(await videoReadiness()).ready)return NextResponse.json({error:'Pred otvorením overte pripojenie videohovorov v nastaveniach.'},{status:400});
      if(config.data.enabled&&!config.data.stripeEnabled)return NextResponse.json({error:'Pred otvorením coachingu musí byť pripravená Stripe platba.'},{status:400});
      const { error } = await db.rpc('appointment_save_settings', { p_config: config.data, p_actor: user.email });
      if (error) throw error;
    } else if (body.action === 'retry_mail') {
      const { error } = await db.from('appointment_mail').update({ state: 'queued', attempts: 0, available_at: new Date().toISOString() }).eq('state','failed');
      if (error) throw error;
    } else if (body.action === 'create') {
      return NextResponse.json({ error: 'Vyberte registrovaného klienta priamo pri voľnom termíne v kalendári.' }, { status: 400 });
    } else if (body.action === 'block') {
      const input = blockSchema.safeParse(body);
      if (!input.success) return NextResponse.json({ error: 'Skontrolujte začiatok a koniec blokovania.' }, { status: 400 });
      const { error } = await db.rpc('appointment_block', { p_start: input.data.startsAt, p_end: input.data.endsAt, p_label: input.data.label, p_actor: user.email });
      if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    } else {
      const input = changeSchema.safeParse(body);
      if (!input.success || (input.data.action === 'move' && !input.data.startsAt)) return NextResponse.json({ error: 'Neplatná zmena rezervácie.' }, { status: 400 });
      const {data:current,error:readError}=await db.from('appointments').select('payment_flow,funding_type').eq('id',input.data.id).single();
      if(readError)throw readError;
      if(input.data.action==='confirm'&&current.payment_flow==='authorize_confirm'&&current.funding_type!=='package'){
        try{if(!(await videoReadiness(input.data.id)).ready)return NextResponse.json({error:'Pred potvrdením overte pripojenie videohovoru.'},{status:409});await captureAppointment(input.data.id,user.email||'admin');}
        catch{return NextResponse.json({error:'Úhradu sa nepodarilo potvrdiť alebo sa ešte spracúva. Obnovte stav; nedošlo k ručnému označeniu platby.'},{status:409});}
      }else if(input.data.action==='confirm'&&current.funding_type==='package'){
        if(!(await videoReadiness(input.data.id)).ready)return NextResponse.json({error:'Pred potvrdením overte pripojenie videohovoru.'},{status:409});
        const result=await db.rpc('appointment_confirm_credit',{p_id:input.data.id,p_actor:user.email});if(result.error)throw result.error;
      }else{
        const { error } = await db.rpc('appointment_change', { p_id: input.data.id, p_action: input.data.action, p_start: input.data.startsAt || null, p_actor: user.email });
        if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
      }
    }
    after(async () => { try { await reconcileAuthorizations();await processDocumentJobs();await processVideoJobs();await processBookingMail(); } catch { /* Durable retry. */ } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Zmenu sa nepodarilo uložiť. Skontrolujte migráciu databázy.' }, { status: 503 }); }
}

