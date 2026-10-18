import { checkAdminAuth } from '@/lib/auth-admin';
import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { z } from 'zod';

const settleSchema = z.object({
  payoutId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await getVerifiedSession(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const result = settleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payoutId' }, { status: 400 });
    }

    const { payoutId } = result.data;
    const adminDb = getServiceSupabase();

    const { data: settled, error: rpcError } = await adminDb.rpc('admin_settle_payout', {
      payout_id: payoutId
    });

    if (rpcError) {
      console.error('Settle RPC error:', rpcError);
      return NextResponse.json({ error: 'Nepodarilo sa aktualizovať žiadosť o výplatu a prepojené provízie' }, { status: 500 });
    }

    if (settled === false) {
      return NextResponse.json({ error: 'Žiadosť nebola nájdená alebo už je vyplatená' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payout settle failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}