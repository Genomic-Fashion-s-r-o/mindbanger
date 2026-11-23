import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { documentPdf, type CoachingDocument } from '@/lib/booking/document-pdf';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 if(!await bookingAdmin())return NextResponse.json({error:'Prihlásenie správcu s druhým faktorom je povinné.'},{status:401,headers});
 try{
  const params=new URL(request.url).searchParams,year=Number(params.get('year')||new Date().getUTCFullYear());if(!Number.isInteger(year)||year<2026||year>2099)return NextResponse.json({error:'Neplatný rok.'},{status:400,headers});
  if(params.get('preview')==='1'){
   const {data,error}=await getServiceSupabase().from('appointment_document_settings').select('provider').eq('id',1).single();if(error)throw Error('document_settings_unavailable');
   const now=new Date().toISOString(),id='11111111-1111-4111-8111-111111111111';
   const sample:CoachingDocument={id,appointment_id:id,intent:'pi_test_vzor',number:'VZOR-2600001',kind:'invoice',amount_cents:4900,issued_at:now,pdf_base64:null,pdf_sha256:null,emailed_at:null,snapshot:{provider:data.provider,customer:{name:'VZOR - NEÚČTOVAŤ / Testovací klient',email:'klient@example.test',address:'Ukážková 1, 811 01 Bratislava, SK'},service:'Coaching',startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:new Date(Date.now()+2*86400000+50*60000).toISOString(),paidAt:now,appointmentId:id,intent:'pi_test_vzor'}};
   return new NextResponse(await documentPdf(sample),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'inline; filename="coaching-vzor.pdf"'}});
  }
  const {data,error}=await getServiceSupabase().from('appointment_documents').select('id,appointment_id,number,kind,issued_at,amount_cents,snapshot,pdf_sha256,emailed_at').like('number',String(year%100).padStart(2,'0')+'%').order('number').limit(10000);if(error)throw Error('documents_unavailable');
  if(params.get('format')==='csv'){
   const cell=(v:unknown)=>{let s=String(v??'');if(/^\s*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
   const rows=[['Číslo','Typ','Vystavené','Úhrada prijatá','Suma','Mena','Položka','Odberateľ','Email','Adresa','Pôvodný doklad','Stripe platba','DIČ dodávateľa'],...(data||[]).map(d=>[d.number,d.kind==='credit'?'Opravný doklad':'Faktúra',d.issued_at,d.snapshot.paidAt,(d.amount_cents/100).toFixed(2),(d.snapshot.currency||'eur').toUpperCase(),d.snapshot.locale==='cs'?'Koučink':'Coaching',d.snapshot.customer.name,d.snapshot.customer.email,d.snapshot.customer.address,d.snapshot.originalNumber||'',d.snapshot.intent,d.snapshot.provider.taxId])];
   return new NextResponse('\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="mindbanger-doklady-${year}.csv"`}});
  }
  return NextResponse.json({year,provider:'Milkam s. r. o.',taxId:'2023282558',vatPayer:false,seriesStart:`${String(year%100).padStart(2,'0')}00001`,documents:(data||[]).map(d=>({...d,snapshot:undefined,ready:!!d.pdf_sha256,pdf_sha256:undefined}))},{headers});
 }catch{return NextResponse.json({error:'Doklady sa nepodarilo načítať.'},{status:503,headers});}
}
