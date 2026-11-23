import {packageBalance} from '@/lib/booking/package-credit';
import { NextResponse } from 'next/server';
import { getClientContext } from '@/lib/client-context';
import { getServiceSupabase } from '@/lib/supabase-service';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'private, no-store'};
 try{
  const c=await getClientContext();if(!c?.accepted)return NextResponse.json({error:'Prihlás sa do svojho účtu.'},{status:401,headers});
  const db=getServiceSupabase();const p=await db.from('appointment_packages').select('id,service_id,total,state,snapshot,purchase_appointment_id,total_minutes,expires_at').eq('user_id',c.user.id).order('created_at',{ascending:false});if(p.error)throw Error('packages_unavailable');
  if(!p.data?.length)return NextResponse.json({packages:[]},{headers});
  const usage=await db.from('appointment_package_sessions').select('package_id,state,appointment_id,credit_minutes').in('package_id',p.data.map(x=>x.id));if(usage.error)throw Error('packages_unavailable');
  return NextResponse.json({packages:p.data.map(x=>({...x,...packageBalance(x,(usage.data||[]).filter(r=>r.package_id===x.id))}))},{headers});
 }catch{return NextResponse.json({error:'Balíčky sa nepodarilo načítať.'},{status:503,headers});}
}
