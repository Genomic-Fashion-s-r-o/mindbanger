import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { publicError, sameOrigin, tokenHash } from '@/lib/booking/store';
import { processBookingMail } from '@/lib/booking/notifications';
export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), action: z.enum(['view', 'cancel']) });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 403 });
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: 'Odkaz nie je platný.' }, { status: 400 });
    const db = getServiceSupabase(), hash = tokenHash(input.data.token);
    const { data: b, error } = await db.from('appointments').select('id,status,starts_at,ends_at,service_name,price,location,hold_until').eq('manage_hash', hash).single();
    if (error || !b) return NextResponse.json({ error: 'Odkaz sa nenašiel alebo už neplatí.' }, { status: 404 });
    if (input.data.action === 'cancel') {
      const { error: updateError } = await db.rpc('appointment_change', { p_id: b.id, p_action: 'cancel', p_actor: 'client', p_hash: hash });
      if (updateError) { const result = publicError(updateError); return NextResponse.json({ error: result.error }, { status: result.status }); }
      after(async () => { try { await processBookingMail(); } catch { /* Retry through cron. */ } });
      return NextResponse.json({ booking: { ...b, status: 'cancelled' } });
    }
    const status = b.status === 'pending' && Date.parse(b.hold_until) <= Date.now() ? 'expired' : b.status;
    return NextResponse.json({ booking: { ...b, status } });
  } catch { return NextResponse.json({ error: 'Správa rezervácie je dočasne nedostupná.' }, { status: 503 }); }
}
