import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { MOBILE_INTEREST_PAGE_SIZE, type MobileInterestPage } from '@/lib/admin-mobile/model';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  if (!await bookingAdmin()) return NextResponse.json({ error: 'Prihlás sa ako admin a over druhý faktor.' }, { status: 401, headers });
  const input = new URL(request.url).searchParams.get('page') ?? '1';
  if (!/^[1-9]\d{0,5}$/.test(input)) return NextResponse.json({ error: 'Vyber platnú stránku.' }, { status: 400, headers });
  const db = getServiceSupabase();
  // Use the same active consent and original registration date as the dashboard counts.
  const query = (head = false) => db.from('admin_mobile_interest_dates')
    .select('interest_id,first_registered_at,contact:program_interest!inner(email)', head ? { count: 'exact', head: true } : undefined)
    .eq('contact.state', 'confirmed').eq('contact.consent_version', 'sugar-interest-genomic-2026-10-21');
  const counted = await query(true);
  if (counted.error || counted.count === null) return NextResponse.json({ error: 'Zoznam emailov sa nepodarilo načítať.' }, { status: 503, headers });
  const total = counted.count, pageCount = Math.max(1, Math.ceil(total / MOBILE_INTEREST_PAGE_SIZE));
  const page = Math.min(Number(input), pageCount), offset = (page - 1) * MOBILE_INTEREST_PAGE_SIZE;
  // The ID breaks timestamp ties so adjacent pages have a deterministic order.
  const result = await query().order('first_registered_at', { ascending: false }).order('interest_id', { ascending: false })
    .range(offset, offset + MOBILE_INTEREST_PAGE_SIZE - 1);
  if (result.error) return NextResponse.json({ error: 'Zoznam emailov sa nepodarilo načítať.' }, { status: 503, headers });
  const rows = result.data as unknown as { interest_id: string; first_registered_at: string; contact: { email: string } }[];
  const body: MobileInterestPage = { page, pageCount, pageSize: MOBILE_INTEREST_PAGE_SIZE, total,
    items: rows.map(row => ({ id: row.interest_id, email: row.contact.email, registered_at: row.first_registered_at })) };
  return NextResponse.json(body, { headers });
}
