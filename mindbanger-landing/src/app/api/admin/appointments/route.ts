import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { getBookingSettings, sameOrigin, publicError, managementToken, siteOrigin, tokenHash } from '@/lib/booking/store';
import { settingsSchema, requestSchema, BOOKING_PAYMENTS_ENABLED } from '@/lib/booking/model';
import { processBookingMail } from '@/lib/booking/notifications';
import { plannerSchema } from '@/lib/booking/planner';
export const dynamic = 'force-dynamic';
const changeSchema = z.object({ action: z.enum(['confirm','cancel','complete','no_show','paid','move']), id: z.uuid(), startsAt: z.iso.datetime({ offset: true }).optional() });
const blockSchema = z.object({ action: z.literal('block'), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), label: z.string().trim().min(2).max(100) });
export async function GET(request: Request) {
  if (!(await bookingAdmin())) return NextResponse.json({ error: 'Prihláste sa ako admin a overte druhý faktor na hlavnom paneli.' }, { status: 401 });
  const { settings, installed } = await getBookingSettings();
  if (!installed) return NextResponse.json({ settings, installed, bookings: [], failedMail: 0, queuedMail: 0 });
  const day = new URL(request.url).searchParams.get('day');
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(`${day}T00:00:00Z`))) return NextResponse.json({ error: 'Vyberte dátum.' }, { status: 400 });
  const start = Date.parse(`${day}T00:00:00Z`) - 3 * 3600000, end = start + 8 * 86400000;
  const db = getServiceSupabase();
  const [bookings, failed, queued] = await Promise.all([
    db.from('appointments').select('id,kind,status,starts_at,ends_at,busy_until,hold_until,service_name,price,location,customer_name,email,phone,paid,created_at').gte('busy_until', new Date(start).toISOString()).lt('starts_at', new Date(end).toISOString()).order('starts_at').limit(500),
    db.from('appointment_mail').select('id', { count: 'exact', head: true }).eq('state','failed'),
    db.from('appointment_mail').select('id', { count: 'exact', head: true }).in('state',['queued','sending']),
  ]);
  if (bookings.error || failed.error || queued.error) return NextResponse.json({ error: 'Kalendár sa nepodarilo načítať.' }, { status: 503 });
  return NextResponse.json({ settings, installed, bookings: bookings.data, failedMail: failed.count, queuedMail: queued.count });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 403 });
  const user = await bookingAdmin();
  if (!user) return NextResponse.json({ error: 'Vyžaduje sa admin s overeným druhým faktorom.' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.action === 'paid' && !BOOKING_PAYMENTS_ENABLED) return NextResponse.json({ error: 'Platobné funkcie sú vypnuté.' }, { status: 409 });
    const db = getServiceSupabase();
    if (body.action === 'schedule') {
      const input = z.object({ planner: plannerSchema, expected: plannerSchema.nullable() }).safeParse(body);
      if (!input.success) return NextResponse.json({ error: input.error.issues[0].message }, { status: 400 });
      const { error } = await db.rpc('appointment_save_planner', { p_planner: input.data.planner, p_expected: input.data.expected, p_actor: user.email });
      if (error?.message?.includes('schedule_changed')) return NextResponse.json({ error: 'Rozvrh medzičasom zmenil iný správca. Pred ďalšou úpravou obnovte stránku.' }, { status: 409 });
      if (error) throw error;
    } else if (body.action === 'settings') {
      const config = settingsSchema.safeParse(body.settings);
      if (!config.success) return NextResponse.json({ error: config.error.issues[0].message }, { status: 400 });
      if (config.data.enabled && (!process.env.BREVO_API_KEY || !process.env.CRON_SECRET || !process.env.NEXT_PUBLIC_SITE_URL)) return NextResponse.json({ error: 'Pred zapnutím nastavte BREVO_API_KEY, CRON_SECRET a NEXT_PUBLIC_SITE_URL v prostredí servera.' }, { status: 400 });
      const { error } = await db.rpc('appointment_save_settings', { p_config: config.data, p_actor: user.email });
      if (error) throw error;
    } else if (body.action === 'retry_mail') {
      const { error } = await db.from('appointment_mail').update({ state: 'queued', attempts: 0, available_at: new Date().toISOString() }).eq('state','failed');
      if (error) throw error;
    } else if (body.action === 'create') {
      const input = requestSchema.safeParse(body.booking);
      if (!input.success || input.data.website) return NextResponse.json({ error: 'Skontrolujte údaje klienta a jeho potvrdenia.' }, { status: 400 });
      const b = input.data, token = managementToken();
      const { error } = await db.rpc('appointment_create', { p_service_id: b.serviceId, p_start: b.startsAt, p_name: b.name, p_email: b.email, p_phone: b.phone, p_hash: tokenHash(token), p_request_id: b.requestId, p_manage_url: `${siteOrigin()}/rezervacia/sprava#${token}`, p_legal_version: b.legalVersion, p_actor: user.email });
      if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    } else if (body.action === 'block') {
      const input = blockSchema.safeParse(body);
      if (!input.success) return NextResponse.json({ error: 'Skontrolujte začiatok a koniec blokovania.' }, { status: 400 });
      const { error } = await db.rpc('appointment_block', { p_start: input.data.startsAt, p_end: input.data.endsAt, p_label: input.data.label, p_actor: user.email });
      if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    } else {
      const input = changeSchema.safeParse(body);
      if (!input.success || (input.data.action === 'move' && !input.data.startsAt)) return NextResponse.json({ error: 'Neplatná zmena rezervácie.' }, { status: 400 });
      const { error } = await db.rpc('appointment_change', { p_id: input.data.id, p_action: input.data.action, p_start: input.data.startsAt || null, p_actor: user.email });
      if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    }
    after(async () => { try { await processBookingMail(); } catch { /* Durable retry. */ } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Zmenu sa nepodarilo uložiť. Skontrolujte migráciu databázy.' }, { status: 503 }); }
}
