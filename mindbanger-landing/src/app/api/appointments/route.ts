import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { createHmac } from 'node:crypto';
import { getBookingSettings, managementToken, publicError, sameOrigin, siteOrigin, tokenHash } from '@/lib/booking/store';
import { requestSchema } from '@/lib/booking/model';
import { availableSlots } from '@/lib/booking/availability';
import { getServiceSupabase } from '@/lib/supabase-service';
import { processBookingMail } from '@/lib/booking/notifications';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url), serviceId = url.searchParams.get('service') || '', day = url.searchParams.get('day') || '';
  const { settings, installed } = await getBookingSettings();
  if (!installed || !settings.enabled) return NextResponse.json({ error: 'Online rezervácie ešte nie sú otvorené.' }, { status: 503 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !settings.services.some(s => s.id === serviceId && s.active)) return NextResponse.json({ error: 'Vyberte službu a dátum.' }, { status: 400 });
  const midnight = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(midnight) || midnight < Date.now() - 86400000 || midnight > Date.now() + (settings.horizonDays + 1) * 86400000) return NextResponse.json({ slots: [] });
  try {
    const { data, error } = await getServiceSupabase().from('appointments').select('starts_at,busy_until,status,hold_until').lt('starts_at', new Date(midnight + 27 * 3600000).toISOString()).gt('busy_until', new Date(midnight - 3 * 3600000).toISOString()).in('status', ['pending', 'confirmed', 'completed', 'no_show', 'blocked']);
    if (error) throw error;
    return NextResponse.json({ slots: availableSlots(settings, serviceId, day, data || []) });
  } catch { return NextResponse.json({ error: 'Kalendár je dočasne nedostupný. Skúste to neskôr.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 8000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413 });
  try {
    const input = requestSchema.safeParse(await request.json());
    if (!input.success || input.data.website) return NextResponse.json({ error: 'Skontrolujte kontaktné údaje a potvrdenia.' }, { status: 400 });
    const { settings, installed } = await getBookingSettings();
    if (!installed || !settings.enabled || !process.env.BREVO_API_KEY) return NextResponse.json({ error: 'Online rezervácie ešte nie sú otvorené.' }, { status: 503 });
    const db = getServiceSupabase(), b = input.data;
    const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local';
    const hash = (v: string) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(v).digest('hex');
    const { data: allowed, error: limitError } = await db.rpc('appointment_rate_limit', { p_email_key: hash(b.email.toLowerCase()), p_ip_key: hash(ip.split(',')[0].trim()) });
    if (limitError) throw limitError;
    if (!allowed) return NextResponse.json({ error: 'Odoslali ste viac žiadostí. Skúste to o hodinu.' }, { status: 429 });
    const token = managementToken();
    const manageUrl = `${siteOrigin()}/rezervacia/sprava#${token}`;
    const { data: id, error } = await db.rpc('appointment_create', { p_service_id: b.serviceId, p_start: b.startsAt, p_name: b.name, p_email: b.email, p_phone: b.phone, p_hash: tokenHash(token), p_request_id: b.requestId, p_manage_url: manageUrl, p_legal_version: b.legalVersion });
    if (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
    // A retry must not receive a new invalid token; the original private link arrives by email.
    after(async () => { try { await processBookingMail(); } catch { /* Durable queue is retried by cron. */ } });
    return NextResponse.json({ id, message: 'Žiadosť je uložená. Súkromný odkaz na jej správu dostanete emailom. Termín platí až po osobnom potvrdení.' }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Žiadosť sa nepodarilo spracovať. Skúste to neskôr.' }, { status: 503 }); }
}
