import {NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '@/lib/booking/store';
import {getServiceSupabase} from '@/lib/supabase-service';

export const dynamic='force-dynamic';
const schema=z.object({fullName:z.string().trim().min(2).max(160),email:z.email().trim().toLowerCase().max(254),contractRef:z.string().trim().min(2).max(200),product:z.string().trim().min(2).max(200),locale:z.enum(['sk','cs','en']),website:z.string().max(100).default('')}).strict();
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(!sameOrigin(request))return NextResponse.json({error:'Neplatný pôvod požiadavky.'},{status:403,headers});
 if(Number(request.headers.get('content-length'))>4000)return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Skontrolujte povinné údaje.'},{status:400,headers});
 if(parsed.data.website)return NextResponse.json({ok:true},{headers});
 const db=getServiceSupabase(),receivedAt=new Date().toISOString();
 const {data,error}=await db.from('digital_withdrawals').insert({full_name:parsed.data.fullName,email:parsed.data.email,contract_ref:parsed.data.contractRef,product:parsed.data.product,locale:parsed.data.locale,received_at:receivedAt}).select('id,received_at').single();
 if(error||!data)return NextResponse.json({error:'Odstúpenie sa nepodarilo zaznamenať. Kontaktujte support@mindbanger.com.'},{status:503,headers});
 const cs=parsed.data.locale==='cs',en=parsed.data.locale==='en';
 const title=en?'Withdrawal notice received':cs?'Oznámení o odstoupení bylo přijato':'Oznámenie o odstúpení bolo prijaté';
 const body=`<p>${esc(title)}</p><p>${en?'Reference':cs?'Referenční číslo':'Referenčné číslo'}: <strong>${esc(String(data.id))}</strong><br>${en?'Received':cs?'Přijato':'Prijaté'}: ${esc(String(data.received_at))}<br>${en?'Name':cs?'Jméno':'Meno'}: ${esc(parsed.data.fullName)}<br>${en?'Contract/order':cs?'Smlouva/objednávka':'Zmluva/objednávka'}: ${esc(parsed.data.contractRef)}<br>${en?'Product':cs?'Produkt':'Produkt'}: ${esc(parsed.data.product)}</p><p>${en?'Genomic Fashion s.r.o. will assess the notice under applicable consumer law. Keep this confirmation.':cs?'Genomic Fashion s.r.o. oznámení posoudí podle závazných spotřebitelských předpisů. Toto potvrzení si uschovejte.':'Genomic Fashion s.r.o. oznámenie posúdi podľa záväzných spotrebiteľských predpisov. Toto potvrdenie si uschovajte.'}</p>`;
 let emailed=false;
 if(process.env.BREVO_API_KEY){
  const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Mindbanger | Genomic Fashion s.r.o.',email:process.env.BOOKING_FROM_EMAIL||'miroslav@mindbanger.com'},to:[{email:parsed.data.email}],bcc:[{email:'support@mindbanger.com'}],replyTo:{email:'support@mindbanger.com'},subject:title,htmlContent:body}),signal:AbortSignal.timeout(12000)}).catch(()=>null);
  emailed=!!response?.ok;
  if(emailed)await db.from('digital_withdrawals').update({confirmation_sent_at:new Date().toISOString()}).eq('id',data.id);
 }
 return NextResponse.json({ok:true,id:data.id,receivedAt:data.received_at,emailed},{headers});
}
