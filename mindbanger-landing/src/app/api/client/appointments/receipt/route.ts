import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientContext } from '@/lib/client-context';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { coachingStripe } from '@/lib/booking/stripe-client';
import { coachingReceipt } from '@/lib/booking/receipt';
import { priceCents } from '@/lib/booking/amount';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
export async function GET(request: Request) {
  try {
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get('id'));
    if (!id.success) return NextResponse.json({ error: 'Neplatná rezervácia.' }, { status: 400, headers });
    const context = await getClientContext();
    const admin = await bookingAdmin();
    if (!context?.accepted && !admin) return NextResponse.json({ error: 'Prihlás sa do svojho účtu.' }, { status: 401, headers });
    let query = getServiceSupabase().from('appointments').select('id,payment_intent_id,price,currency').eq('id', id.data).eq('kind', 'booking');
    if (!admin) query = query.eq('user_id', context!.user.id);
    const { data, error } = await query.maybeSingle();
    if (error) throw Error('receipt_unavailable');
    if (!data?.payment_intent_id) return NextResponse.json({ error: 'Potvrdenie úhrady zatiaľ nie je dostupné.' }, { status: 404, headers });
    const stripe = coachingStripe();
    const intent = await stripe.paymentIntents.retrieve(data.payment_intent_id, { expand: ['latest_charge'] });
    const charge = typeof intent.latest_charge === 'string' ? await stripe.charges.retrieve(intent.latest_charge) : intent.latest_charge;
    const url = charge && coachingReceipt(intent, charge, id.data,priceCents(data.price),data.currency||'eur');
    if (!url) return NextResponse.json({ error: 'Platba ešte nebola strhnutá alebo sa potvrdenie pripravuje.' }, { status: 409, headers });
    return new NextResponse(null, { status: 303, headers: { ...headers, Location: url } });
  } catch { return NextResponse.json({ error: 'Potvrdenie úhrady sa nepodarilo načítať. Skús to znova o chvíľu.' }, { status: 503, headers }); }
}
