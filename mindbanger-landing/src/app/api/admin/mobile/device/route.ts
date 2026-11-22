import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bookingAdmin } from '@/lib/booking/admin';
import { sameOrigin } from '@/lib/booking/store';
import { getServiceSupabase } from '@/lib/supabase-service';
import { mobileFirebaseConfig, mobilePushReady, sendMobilePush } from '@/lib/admin-mobile/push';
import { randomUUID } from 'node:crypto';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const schema = z.object({ id: z.uuid(), token: z.string().min(20).max(4096), bookings: z.boolean(), interests: z.boolean() }).strict();
export async function GET(request: Request) {
  const user = await bookingAdmin();
  if (!user) return NextResponse.json({ error: 'Vyžaduje sa admin a druhý faktor.' }, { status: 401, headers });
  const id = new URL(request.url).searchParams.get('id');
  let device = null;
  if (id && z.uuid().safeParse(id).success) {
    const result = await getServiceSupabase().from('admin_mobile_devices').select('bookings,interests').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (result.error) return NextResponse.json({ error: 'Nastavenia sú nedostupné.' }, { status: 503, headers });
    device = result.data;
  }
  return NextResponse.json({ firebase: mobileFirebaseConfig(), configured: mobilePushReady(), device }, { headers });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod.' }, { status: 403, headers });
  const user = await bookingAdmin();
  if (!user) return NextResponse.json({ error: 'Vyžaduje sa admin a druhý faktor.' }, { status: 401, headers });
  if (Number(request.headers.get('content-length')) > 8192) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413, headers });
  try {
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413, headers });
    const body = schema.safeParse(JSON.parse(raw));
    if (!body.success) return NextResponse.json({ error: 'Neplatné zariadenie.' }, { status: 400, headers });
    if (!mobilePushReady()) return NextResponse.json({ error: 'Push upozornenia ešte nie sú nakonfigurované.' }, { status: 503, headers });
    const b = body.data;
    const { error } = await getServiceSupabase().rpc('admin_mobile_register_device', { p_id: b.id, p_user: user.id, p_token: b.token, p_bookings: b.bookings, p_interests: b.interests });
    return error ? NextResponse.json({ error: 'Zariadenie sa nepodarilo pripojiť.' }, { status: 503, headers }) : NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400, headers }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod.' }, { status: 403, headers });
  const user = await bookingAdmin();
  if (!user) return NextResponse.json({ error: 'Vyžaduje sa admin a druhý faktor.' }, { status: 401, headers });
  const id = new URL(request.url).searchParams.get('id');
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Neplatné zariadenie.' }, { status: 400, headers });
  const { error } = await getServiceSupabase().from('admin_mobile_devices').delete().eq('id', id!).eq('user_id', user.id);
  return error ? NextResponse.json({ error: 'Zariadenie sa nepodarilo odpojiť.' }, { status: 503, headers }) : NextResponse.json({ ok: true }, { headers });
}
// One test per minute and device, independent of registration/foreground refresh.
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod.' }, { status: 403, headers });
  const user = await bookingAdmin();
  if (!user) return NextResponse.json({ error: 'Vyžaduje sa admin a druhý faktor.' }, { status: 401, headers });
  const id = new URL(request.url).searchParams.get('id');
  if (!z.uuid().safeParse(id).success || !mobilePushReady()) return NextResponse.json({ error: 'Upozornenia nie sú pripravené.' }, { status: 409, headers });
  const db = getServiceSupabase();
  const found = await db.from('admin_mobile_devices').select('token').eq('id', id!).eq('user_id', user.id).maybeSingle();
  if (found.error || !found.data) return NextResponse.json({ error: 'Najprv zapni upozornenia.' }, { status: 409, headers });
  // Use a DB conditional update so concurrent requests cannot bypass the interval.
  const now = new Date().toISOString();
  const claimed = await db.from('admin_mobile_devices').update({ last_test_at: now }).eq('id', id!).eq('user_id', user.id)
    .or('last_test_at.is.null,last_test_at.lt.' + new Date(Date.now() - 60000).toISOString()).select('id');
  if (claimed.error) return NextResponse.json({ error: 'Skúšobné upozornenie je dočasne nedostupné.' }, { status: 503, headers });
  if (!claimed.data?.length) return NextResponse.json({ error: 'Od poslednej skúšky ešte neuplynula minúta. Počkaj a skús znova.' }, { status: 429, headers });
  try {
    const outcome = await sendMobilePush({ kind: 'booking', eventId: randomUUID(), token: found.data.token });
    return outcome === 'sent' ? NextResponse.json({ ok: true }, { headers }) : NextResponse.json({ error: 'Skúšobné upozornenie sa nepodarilo odoslať.' }, { status: 503, headers });
  } catch { return NextResponse.json({ error: 'Skúšobné upozornenie sa nepodarilo odoslať.' }, { status: 503, headers }); }
}
