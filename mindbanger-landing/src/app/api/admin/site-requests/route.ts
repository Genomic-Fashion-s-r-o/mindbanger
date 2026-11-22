import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
export async function GET(request: Request) {
  if (!await bookingAdmin()) return NextResponse.json({ error: 'Vyžaduje sa admin s druhým faktorom.' }, { status: 401, headers });
  const q = new URL(request.url).searchParams;
  const from = date.safeParse(q.get('from')), to = date.safeParse(q.get('to'));
  if (!from.success || !to.success || from.data > to.data || Date.parse(to.data) - Date.parse(from.data) > 89 * 86400000)
    return NextResponse.json({ error: 'Vyberte platné obdobie do 90 dní.' }, { status: 400, headers });
  const db = getServiceSupabase();
  const [counts, setup] = await Promise.all([
    db.from('site_request_totals').select('day,path,request_count').gte('day', from.data).lte('day', to.data).order('day', { ascending: false }).order('path').limit(4000),
    db.from('site_request_counter_setup').select('started_at').eq('id', 1).single(),
  ]);
  if (counts.error || setup.error) return NextResponse.json({ error: 'Počítadlo je dočasne nedostupné. Nezobrazujeme náhradnú nulu.' }, { status: 503, headers });
  return NextResponse.json({ rows: counts.data, startedAt: setup.data.started_at, retentionDays: 90 }, { headers });
}
