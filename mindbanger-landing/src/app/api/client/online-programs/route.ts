import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { clientIdentity, failure, json } from '@/lib/online-programs/http';
import { checked, listClientPrograms, ProgramError } from '@/lib/online-programs/store';
export async function GET(request: Request) {
  try {
    const user = await clientIdentity(), orderId = new URL(request.url).searchParams.get('order');
    if (orderId) {
      if (!z.uuid().safeParse(orderId).success) throw new ProgramError('Neplatná objednávka.');
      const order = checked(await getServiceSupabase().from('online_program_orders').select('status,expires_at,offer_expired_at').eq('id', orderId).eq('user_id', user.id).maybeSingle());
      if (!order) throw new ProgramError('Objednávka sa nenašla.', 404);
      return json({ status:order.offer_expired_at?'offer_expired':order.status === 'pending' && Date.parse(order.expires_at) <= Date.now() ? 'expired' : order.status });
    }
    return json(await listClientPrograms(user.id));
  } catch (error) { return failure(error); }
}
