import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientContext } from '@/lib/client-context';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const search=new URL(request.url).searchParams,id=z.uuid().safeParse(search.get('id')),document=search.get('document');
  if(!id.success||(document&&!z.uuid().safeParse(document).success))return NextResponse.json({error:'Neplatný doklad.'},{status:400,headers});
  const [context,admin]=await Promise.all([getClientContext(),bookingAdmin()]);
  if(!context?.accepted&&!admin)return NextResponse.json({error:'Prihlás sa do svojho účtu.'},{status:401,headers});
  const db=getServiceSupabase();let booking=db.from('appointments').select('id').eq('id',id.data).eq('kind','booking');if(!admin)booking=booking.eq('user_id',context!.user.id);
  const owned=await booking.maybeSingle();if(owned.error)throw Error('document_unavailable');if(!owned.data)return NextResponse.json({error:'Rezervácia sa nenašla.'},{status:404,headers});
  if(document){
   const {data,error}=await db.from('appointment_documents').select('number,kind,pdf_base64').eq('appointment_id',id.data).eq('id',document).maybeSingle();if(error)throw Error('document_unavailable');
   if(!data?.pdf_base64)return NextResponse.json({error:'PDF doklad sa pripravuje.'},{status:404,headers});
   return new NextResponse(Buffer.from(data.pdf_base64,'base64'),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${data.kind==='credit'?'opravny-doklad':'coaching'}-${data.number}.pdf"`}});
  }
  const {data,error}=await db.from('appointment_documents').select('id,number,kind,issued_at,amount_cents,pdf_sha256').eq('appointment_id',id.data).order('issued_at');if(error)throw Error('document_unavailable');
  return NextResponse.json({documents:(data||[]).map(d=>({...d,ready:!!d.pdf_sha256,pdf_sha256:undefined}))},{headers});
 }catch{return NextResponse.json({error:'Doklady sa nepodarilo načítať.'},{status:503,headers});}
}
