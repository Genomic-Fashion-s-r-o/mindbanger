import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getClientContext } from '@/lib/client-context';
import { getServiceSupabase } from '@/lib/supabase-service';
import { sameOrigin, publicError } from '@/lib/booking/store';
import { processBookingMail } from '@/lib/booking/notifications';
const cancelSchema = z.object({ id: z.uuid(), action: z.literal('cancel') }).strict();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403 });
  try {
    const context = await getClientContext();
    if (!context) return NextResponse.json({ error: 'Prihláste sa znova.' }, { status: 401 });
    if (Number(request.headers.get('content-length')) > 2000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413 });
    const input = cancelSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: 'Neplatná rezervácia.' }, { status: 400 });
    const { error } = await getServiceSupabase().rpc('appointment_cancel_for_client', { p_user: context.user.id, p_id: input.data.id });
    if (error?.message?.includes('booking_not_found')) return NextResponse.json({ error: 'Rezervácia sa nenašla.' }, { status: 404 });
    if (error) { const e = publicError(error); return NextResponse.json({ error: e.error }, { status: e.status }); }
    after(async () => { try { await processBookingMail(); } catch { /* Durable cron retry. */ } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Rezerváciu sa nepodarilo zrušiť. Skúste to znova.' }, { status: 503 }); }
}
