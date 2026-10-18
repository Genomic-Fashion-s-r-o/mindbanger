import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { z } from 'zod';

const payoutSchema = z.object({
  affiliateId: z.string().uuid('Neplatné ID affiliate partnera'),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await getVerifiedSession(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = payoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { affiliateId } = result.data;

    // Over, že affiliateId patrí prihlásenému používateľovi
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, paypal_email')
      .eq('id', affiliateId)
      .eq('user_id', session.user.id)
      .single();

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid affiliate' }, { status: 403 });
    }

    const adminDb = getServiceSupabase();

    // Zavolanie atómovej RPC funkcie s explicitným chybovým handlingom
    const { data: payoutId, error: rpcError } = await adminDb.rpc('create_payout_request', {
      p_affiliate_id: affiliateId,
      p_paypal_email: affiliate.paypal_email || 'Not provided'
    });

    if (rpcError) {
      if (rpcError.message.includes('nespracovaný výber')) {
        return NextResponse.json({ error: 'Máte už jeden nespracovaný výber (pending). Počkajte na jeho vybavenie.' }, { status: 409 });
      }
      if (rpcError.message.includes('minimálny výber')) {
        return NextResponse.json({ error: 'Vypočítaná suma je menšia ako minimálny výber (20 EUR)' }, { status: 400 });
      }
      
      console.error('Create payout RPC error:', rpcError);
      
      // Fallback logovanie pre support
      try {
        await adminDb.from('contact_messages').insert([
          { email: session.user.email, name: 'Affiliate System', message: `PAYOUT_ERROR|REQUEST: Error processing payout creation via RPC. UUID: ${affiliateId}` }
        ]);
      } catch (_) {}

      return NextResponse.json({ error: 'Nastala chyba pri spracovaní žiadosti o výplatu' }, { status: 500 });
    }

    return NextResponse.json({ success: true, payoutId });
  } catch (error: any) {
    console.error('Payout request failed:', error);
    return NextResponse.json({ error: 'Nastala chyba pri spracovaní žiadosti o výplatu' }, { status: 500 });
  }
}
