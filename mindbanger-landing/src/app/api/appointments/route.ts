import{portalLocale}from '@/lib/portal-locale-server';
import {COACHING_CREDIT_SERVICES} from '@/lib/booking/package-credit';
import { getClientContext } from '@/lib/client-context';
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { createHmac } from 'node:crypto';
import { getBookingSettings, managementToken, publicError, sameOrigin, siteOrigin, tokenHash } from '@/lib/booking/store';
import { clientBookingSchema, requestSchema } from '@/lib/booking/model';
import { publicSlotAvailability } from '@/lib/booking/availability';
import { getServiceSupabase } from '@/lib/supabase-service';
import { processBookingMail } from '@/lib/booking/notifications';
import { attachBookingSource } from '@/lib/marketing-attribution-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url), serviceId = url.searchParams.get('service') || '', day = url.searchParams.get('day') || '';
  const { settings, installed } = await getBookingSettings();
  if (!installed || !settings.enabled || !settings.stripeEnabled) return NextResponse.json({ error: 'Online rezervácie ešte nie sú otvorené.' }, { status: 503 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !settings.services.some(s => s.id === serviceId && s.active)) return NextResponse.json({ error: 'Vyberte službu a dátum.' }, { status: 400 });
  const midnight = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(midnight) || midnight < Date.now() - 86400000 || midnight > Date.now() + (settings.horizonDays + 1) * 86400000) return NextResponse.json({ slots: [], occupiedSlots: [] });
  try {
    const { data, error } = await getServiceSupabase().from('appointments').select('starts_at,ends_at,busy_until,kind,status,hold_until').lt('starts_at', new Date(midnight + 27 * 3600000).toISOString()).gt('busy_until', new Date(midnight - 3 * 3600000).toISOString()).in('status', ['pending', 'confirmed', 'completed', 'no_show', 'blocked']);
    if (error) throw error;
    const duration=Number(url.searchParams.get('duration')||0),service=settings.services.find(s=>s.id===serviceId)!;
    if(duration&&(!Number.isInteger(duration)||duration<30||duration>600||duration%30!==0||(!COACHING_CREDIT_SERVICES.includes(serviceId)&&duration!==(service.slotMinutes||service.minutes+10))))return NextResponse.json({error:'Neplatná dĺžka rezervácie.'},{status:400});
    const calendarSettings=duration?{...settings,services:settings.services.map(s=>s.id===serviceId?{...s,minutes:duration===30?25:duration-10,slotMinutes:duration}:s)}:settings;
    return NextResponse.json(publicSlotAvailability(calendarSettings, serviceId, day, data || []), {headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({ error: 'Kalendár je dočasne nedostupný. Skúste to neskôr.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if(process.env.BOOKING_CATALOG_PREVIEW==='1')return NextResponse.json({error:'Toto je ukážka novej ponuky; objednávky v preview sa neukladajú.'},{status:503});
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 8000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413 });
  try {
    const context = await getClientContext();
    if (!context) return NextResponse.json({ error: 'Prihláste sa do svojho účtu.' }, { status: 401 });
    if (!context.accepted || !context.profile?.full_name || !context.user.email) return NextResponse.json({ error: 'Najprv dokončite svoj profil a potvrďte podmienky účtu.' }, { status: 403 });
    if(!requestSchema.shape.name.safeParse(context.profile.full_name).success || !requestSchema.shape.email.safeParse(context.user.email).success) return NextResponse.json({error:'Skontrolujte meno a email vo svojom profile.'},{status:400});
    const input = clientBookingSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: 'Skontrolujte kontaktné údaje a potvrdenia.' }, { status: 400 });
    const { settings, installed } = await getBookingSettings();
    if (!installed || !settings.enabled || !settings.stripeEnabled || !process.env.BREVO_API_KEY) return NextResponse.json({ error: 'Online rezervácie ešte nie sú otvorené.' }, { status: 503 });
    const locale=await portalLocale(request);
    const db = getServiceSupabase(), b = { ...input.data, name: `${input.data.firstName} ${input.data.lastName}`, email: context.user.email };
    const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local';
    const hash = (v: string) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(v).digest('hex');
    const { data: allowed, error: limitError } = await db.rpc('appointment_rate_limit', { p_email_key: hash(b.email.toLowerCase()), p_ip_key: hash(ip.split(',')[0].trim()) });
    if (limitError) throw limitError;
    if (!allowed) return NextResponse.json({ error: 'Odoslali ste viac žiadostí. Skúste to o hodinu.' }, { status: 429 });
    const token = managementToken();
    const manageUrl = `${siteOrigin()}/rezervacia/sprava#${token}`;
    const { data: id, error } = await db.rpc('appointment_create_contact', {p_contact:{firstName:b.firstName,lastName:b.lastName,city:b.city,country:b.country},p_booking:{ p_locale:locale,p_currency:locale==='cs'?'czk':'eur',p_slot_minutes:b.reservationMinutes||0,p_service:b.serviceId,p_package:b.packageId,p_credit:b.entitlementId||null,p_participant:b.participantName,p_age:b.participantAge,p_guardian:b.guardianConsent,p_user: context.user.id, p_start: b.startsAt, p_name: b.name, p_email: b.email, p_phone: b.phone, p_hash: tokenHash(token), p_request_id: b.requestId, p_manage_url: manageUrl, p_legal_version: b.legalVersion, p_topic: b.topic, p_note: b.topicNote, p_adult: b.adult }});
    if (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
    if (b.attributionConsent === 'booking-attribution-v1') await attachBookingSource(id, context.user.id, b.attributionConsent);
    // A retry must not receive a new invalid token; the original private link arrives by email.
    after(async () => { try { await processBookingMail(); } catch { /* Durable queue is retried by cron. */ } });
    const {data:booking}=await db.from('appointments').select('id,status,hold_until,paid,payment_state,payment_flow,payment_terms,starts_at,price,currency,locale,funding_type,package_snapshot').eq('id',id).eq('user_id',context.user.id).single();
    return NextResponse.json({ id, booking, message: 'Žiadosť je uložená. Súkromný odkaz na jej správu dostanete emailom. Termín platí až po osobnom potvrdení.' }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Žiadosť sa nepodarilo spracovať. Skúste to neskôr.' }, { status: 503 }); }
}
