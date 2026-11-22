import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { validDay } from '@/lib/admin-mobile/model';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  if (!await bookingAdmin()) return NextResponse.json({ error: 'Prihlás sa ako admin a over druhý faktor.' }, { status: 401, headers });
  const day = new URL(request.url).searchParams.get('day') || '';
  if (!validDay(day)) return NextResponse.json({ error: 'Vyber platný dátum.' }, { status: 400, headers });
  const { data, error } = await getServiceSupabase().rpc('admin_mobile_overview', { p_day: day });
  if (error) return NextResponse.json({ error: 'Prehľad sa nepodarilo načítať. Skús obnoviť údaje.' }, { status: 503, headers });
  return NextResponse.json(data, { headers });
}
