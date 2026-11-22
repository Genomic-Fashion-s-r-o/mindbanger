import {NextResponse} from 'next/server';
import {z} from 'zod';
import {bookingAdmin} from '@/lib/booking/admin';
import {sameOrigin} from '@/lib/booking/store';
import {getServiceSupabase} from '@/lib/supabase-service';
import {purgeTimeRequests} from '@/lib/time-request-store';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request) {
  if(!await bookingAdmin()) return NextResponse.json({error:'Over prihlásenie a druhý faktor.'},{status:401,headers});
  try {
    await purgeTimeRequests();
    const url=new URL(request.url),state=url.searchParams.get('state')||'new';
    if(!['all','new','contacted','resolved','closed'].includes(state))return NextResponse.json({error:'Neplatný filter.'},{status:400,headers});
    const offset=Math.min(100000,Math.max(0,Math.floor(Number(url.searchParams.get('offset'))||0)));
    let q=getServiceSupabase().from('appointment_time_requests').select('id,first_name,last_name,email,phone,time_windows,note,service_name,locale,state,revision,created_at',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+49);
    if(state!=='all')q=q.eq('state',state);
    const {data,error,count}=await q;if(error)throw Error('unavailable');
    return NextResponse.json({requests:data,total:count||0},{headers});
  } catch {return NextResponse.json({error:'Požiadavky sú dočasne nedostupné.'},{status:503,headers});}
}
export async function PATCH(request:Request) {
  if(!sameOrigin(request))return NextResponse.json({error:'Neplatný pôvod.'},{status:403,headers});
  if(!await bookingAdmin())return NextResponse.json({error:'Over prihlásenie a druhý faktor.'},{status:401,headers});
  try {
    const raw=await request.text();if(Buffer.byteLength(raw)>1000)return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
    const parsed=z.object({id:z.uuid(),revision:z.number().int().min(1),state:z.enum(['new','contacted','resolved','closed'])}).strict().safeParse(JSON.parse(raw));
    if(!parsed.success)return NextResponse.json({error:'Neplatné údaje.'},{status:400,headers});
    const b=parsed.data;const {data,error}=await getServiceSupabase().from('appointment_time_requests').update({state:b.state,revision:b.revision+1,updated_at:new Date().toISOString()}).eq('id',b.id).eq('revision',b.revision).select('id').maybeSingle();
    if(error)throw Error('unavailable');if(!data)return NextResponse.json({error:'Požiadavka sa zmenila alebo už nie je dostupná. Obnov prehľad.'},{status:409,headers});
    return NextResponse.json({ok:true},{headers});
  }catch{return NextResponse.json({error:'Zmenu sa nepodarilo uložiť.'},{status:503,headers});}
}
