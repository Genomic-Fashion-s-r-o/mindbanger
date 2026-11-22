import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';

export async function GET(request: Request) {
  if (!(await bookingAdmin())) return NextResponse.json({ error: 'Vyžaduje sa správca s overeným druhým faktorom.' }, { status: 401 });
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (query.length < 2 || query.length > 80) return NextResponse.json({ clients: [] });
  const { data, error } = await getServiceSupabase().rpc('appointment_admin_clients', { p_query: query, p_version: CLIENT_TERMS_VERSION });
  if (error) return NextResponse.json({ error: 'Klientov sa nepodarilo načítať.' }, { status: 503 });
  return NextResponse.json({ clients: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
