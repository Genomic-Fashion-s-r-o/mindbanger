import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getClientContext } from '@/lib/client-context';
import { getServiceSupabase } from '@/lib/supabase-service';
import { sameOrigin } from '@/lib/booking/store';
import { reconcileAuthorizations } from '@/lib/booking/authorization';
import { processVideoJobs } from '@/lib/booking/video-jobs';
import { processBookingMail } from '@/lib/booking/notifications';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Neplatná požiadavka.'},{status:403});
 try{
  const context=await getClientContext();
  if(!context)return NextResponse.json({error:'Prihlás sa do svojho účtu.'},{status:401});
  if(Number(request.headers.get('content-length'))>2000)return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413});
  const input=z.object({id:z.uuid()}).strict().safeParse(await request.json());
  if(!input.success)return NextResponse.json({error:'Vyber rezerváciu.'},{status:400});
  const result=await getServiceSupabase().rpc('appointment_withdraw',{p_id:input.data.id,p_user:context.user.id});
  if(result.error)return NextResponse.json({error:'Zmluva sa nenašla. Odstúpenie môžeš oznámiť aj na miroslav@mindbanger.com.'},{status:409});
  after(async()=>{try{await reconcileAuthorizations();await processVideoJobs();await processBookingMail();}catch{/* Durable queue retry. */}});
  return NextResponse.json({success:true,receivedAt:result.data});
 }catch{return NextResponse.json({error:'Oznámenie sa nepodarilo uložiť. Skús to znova alebo napíš na miroslav@mindbanger.com.'},{status:503});}
}
