import {packageBalance} from '@/lib/booking/package-credit';
import {NextResponse} from 'next/server';
import {bookingAdmin} from '@/lib/booking/admin';
import {getServiceSupabase} from '@/lib/supabase-service';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'private, no-store'};if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s druhým faktorom.'},{status:401,headers});
 try{const db=getServiceSupabase(),p=await db.from('appointment_packages').select('id,purchase_appointment_id,snapshot,total,state,total_minutes,expires_at').order('created_at',{ascending:false}).limit(500);if(p.error)throw Error();if(!p.data?.length)return NextResponse.json({packages:[]},{headers});
 const [bookings,usage]=await Promise.all([db.from('appointments').select('id,customer_name,email').in('id',p.data.map(x=>x.purchase_appointment_id)),db.from('appointment_package_sessions').select('package_id,appointment_id,state,credit_minutes').in('package_id',p.data.map(x=>x.id))]);if(bookings.error||usage.error)throw Error();
 return NextResponse.json({packages:p.data.map(x=>{const rows=(usage.data||[]).filter(y=>y.package_id===x.id);return {...x,...packageBalance(x,rows),review:rows.filter(y=>y.state==='review'),customer:bookings.data?.find(y=>y.id===x.purchase_appointment_id)};})},{headers});
 }catch{return NextResponse.json({error:'Balíčky sa nepodarilo načítať.'},{status:503,headers});}
}
