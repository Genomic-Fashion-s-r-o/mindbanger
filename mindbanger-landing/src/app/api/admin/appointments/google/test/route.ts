import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { bookingAdmin } from '@/lib/booking/admin';
import { sameOrigin } from '@/lib/booking/store';
import { GOOGLE_OWNER } from '@/lib/booking/google-connection';
import { googleMeetReadiness, ensureGoogleMeet, cancelGoogleMeet } from '@/lib/booking/google-meet';
export const maxDuration=120;
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Neplatná požiadavka.'},{status:403});
 if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s MFA.'},{status:401});
 const start=Date.now()+3600000;
 const booking={id:'test-'+randomUUID(),starts_at:new Date(start).toISOString(),ends_at:new Date(start+50*60000).toISOString(),customer_name:null,email:GOOGLE_OWNER};
 let tested=false,cleaned=false,attempted=false;
 try{
  if(!(await googleMeetReadiness()).ready)return NextResponse.json({error:'Najprv dokončite prepojenie Google.'},{status:409});
  attempted=true;let meeting=await ensureGoogleMeet(booking);
  if(!meeting.joinUrl)meeting=await ensureGoogleMeet(booking);
  tested=!!meeting.joinUrl;
 }catch{/* Generic errors keep provider responses and credentials private. */}
 finally{try{if(attempted)await cancelGoogleMeet(booking);cleaned=true;}catch{/* Report a cleanup failure instead of claiming success. */}}
 if(!cleaned)return NextResponse.json({error:'Test sa nepodarilo upratať. V Google kalendári skontrolujte testovú udalosť s číslom '+booking.id+'.'},{status:503});
 return NextResponse.json(tested?{ready:true,message:'Google Meet odkaz bol skutočne vytvorený a overený. Dočasná testová udalosť bola odstránená. Platba ani email sa nevytvorili.'}:{error:'Google Meet odkaz sa ešte nepodarilo vytvoriť. Skúste test znova; príprava konferencie môže chvíľu trvať.'},{status:tested?200:503,headers:{'Cache-Control':'private, no-store'}});
}
