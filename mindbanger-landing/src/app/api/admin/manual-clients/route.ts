import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { sameOrigin } from '@/lib/booking/store';
import { manualContactSchema } from '@/lib/booking/manual-model';
import { getServiceSupabase } from '@/lib/supabase-service';

const headers = { 'Cache-Control': 'private, no-store' };
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403, headers });
  const admin = await bookingAdmin();
  if (!admin) return NextResponse.json({ error: 'Vyžaduje sa správca s druhým faktorom.' }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 4000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413, headers });
    const input = manualContactSchema.safeParse(JSON.parse(raw));
    if (!input.success) return NextResponse.json({ error: 'Skontroluj meno, priezvisko, email a kontakty.' }, { status: 400, headers });
    const c = input.data, db = getServiceSupabase();
    const lookup = async () => {
      const r = await db.rpc('coaching_manual_lookup', { p_email: c.email });
      if (r.error) throw Error('lookup_unavailable');
      return r.data as string | null;
    };
    let id = await lookup(), existing = !!id;
    if (!id) {
      // Creates a passwordless identity only. Email remains unverified; no terms,
      // marketing consent, invitation or session is created on the client's behalf.
      const result = await db.auth.admin.createUser({ email: c.email, email_confirm: false });
      if (result.error || !result.data.user) {
        id = await lookup(); existing = !!id;
        if (!id) throw Error('create_unavailable');
      } else id = result.data.user.id;
    }
    const result = await db.rpc('coaching_manual_enroll', { p_user: id, p_contact: c, p_actor: admin.id });
    if (result.error) throw Error('enroll_unavailable');
    return NextResponse.json({ ok: true, user: id, existing }, { headers });
  } catch {
    return NextResponse.json({ error: 'Klienta sa nepodarilo uložiť. Skús to znova; rovnaký email nevytvorí druhý účet.' }, { status: 503, headers });
  }
}
