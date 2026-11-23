import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { clientIdentity,failure,json } from '@/lib/online-programs/http';
import { checked,ProgramError } from '@/lib/online-programs/store';
import { authSessionId,funnelView } from '@/lib/member-funnels/store';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){try{const user=await clientIdentity(),{id}=await context.params;if(!z.uuid().safeParse(id).success)throw new ProgramError('Neplatná ponuka.');return json(await funnelView(user.id,id));}catch(error){return failure(error);}}
export async function POST(request:Request,context:Context){try{
 const user=await clientIdentity(request),{id}=await context.params,session=await authSessionId();if(!z.uuid().safeParse(id).success)throw new ProgramError('Neplatná ponuka.');if(!session)throw new ProgramError('Prihlás sa znova.',401);
 checked(await getServiceSupabase().rpc('member_funnel_begin',{p_user:user.id,p_access:id,p_session:session}));return json(await funnelView(user.id,id));
}catch(error){return failure(error);}}
