import{portalText,portalHtml}from '@/lib/portal-text';
import{normalizeLocale}from '@/lib/portal-locale';
import 'server-only';
import { createHash } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase-service';
import { coachingStripe } from './stripe-client';
import { coachingReceipt } from './receipt';
import { documentPdf, type CoachingDocument } from './document-pdf';
import { priceCents } from './amount';

export async function processDocumentJobs(limit=3){
 const db=getServiceSupabase();let issued=0,failed=0;
 for(let i=0;i<limit;i++){
  const {data:job,error}=await db.rpc('appointment_claim_document');if(error)throw Error('document_queue_unavailable');if(!job)break;
  try{
   const stripe=coachingStripe(),intent=await stripe.paymentIntents.retrieve(job.booking.payment_intent_id,{expand:['latest_charge']});
   const charge=typeof intent.latest_charge==='string'?await stripe.charges.retrieve(intent.latest_charge):intent.latest_charge;
   if(!charge||!coachingReceipt(intent,charge,job.id,priceCents(job.booking.price),job.booking.currency||'eur'))throw Error('document_payment_unverified');
   const billing=charge.billing_details,address=billing.address;
   const customer={name:billing.name||job.booking.customer_name,email:job.booking.email,address:address?[address.line1,address.line2,[address.postal_code,address.city].filter(Boolean).join(' '),address.state,address.country].filter(Boolean).join(', '):''};
   const result=await db.rpc('appointment_issue_documents',{p_id:job.id,p_lease:job.lease,p_intent:intent.id,p_customer:customer,p_paid_at:job.paidAt,p_refunded:charge.amount_refunded});
   if(result.error)throw Error('document_issue_failed');
   for(const d of (result.data||[]) as CoachingDocument[]){
    let content=d.pdf_base64;
    if(!content){const bytes=await documentPdf(d);content=bytes.toString('base64');const saved=await db.from('appointment_documents').update({pdf_base64:content,pdf_sha256:createHash('sha256').update(bytes).digest('hex')}).eq('id',d.id).is('pdf_base64',null);if(saved.error)throw Error('document_pdf_save_failed');}
    if(!d.emailed_at){
     if(!process.env.BREVO_API_KEY)throw Error('document_mail_unavailable');
     const cs=d.snapshot.locale==='cs',title=portalText(d.kind==='credit'?'Opravný doklad':cs?'Doklad za koučink':'Doklad za Coaching',normalizeLocale(d.snapshot.locale))+' '+d.number;
     const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Mindbanger | Milkam s. r. o.',email:process.env.BOOKING_FROM_EMAIL||'miroslav@mindbanger.com'},to:[{email:d.snapshot.customer.email}],bcc:[{email:d.snapshot.provider.email}],replyTo:{email:d.snapshot.provider.email},subject:portalText(title,normalizeLocale(d.snapshot.locale)),htmlContent:portalHtml(cs?`<p>${title}</p><p>V příloze najdeš PDF doklad s položkou Koučink. ${d.kind==='invoice'?'Platbu kartou už evidujeme, nic dalšího neplať.':'Doklad eviduje vrácení platby.'}</p><p>Doklady najdeš také u rezervace ve svém účtu na <a href="https://www.mindbanger.com/cz/ucet/rezervacie">Mindbanger.com</a>.</p><p>Milkam s. r. o. | Dodavatel není plátcem DPH.</p>`:`<p>${title}</p><p>V prílohe nájdeš PDF doklad s položkou Coaching. ${d.kind==='invoice'?'Úhradu kartou už evidujeme, nič ďalšie neplať.':'Doklad eviduje vrátenie platby.'}</p><p>Doklady nájdeš aj pri rezervácii vo svojom účte na <a href="https://www.mindbanger.com/ucet/rezervacie">Mindbanger.com</a>.</p><p>Milkam s. r. o. | Dodávateľ nie je platiteľom DPH.</p>`,normalizeLocale(d.snapshot.locale)),attachment:[{name:`${d.kind==='credit'?'opravny-doklad':'coaching'}-${d.number}.pdf`,content}]}),signal:AbortSignal.timeout(15000)});
     if(!response.ok)throw Error('document_mail_failed');
     const saved=await db.from('appointment_documents').update({emailed_at:new Date().toISOString()}).eq('id',d.id).is('emailed_at',null);if(saved.error)throw Error('document_mail_save_failed');
    }
   }
   const done=await db.from('appointment_document_jobs').update({done_revision:job.revision,lease:null,lease_until:null,attempts:0}).eq('appointment_id',job.id).eq('lease',job.lease);if(done.error)throw Error('document_job_finish_failed');issued++;
  }catch{
   failed++;await db.from('appointment_document_jobs').update({lease:null,lease_until:null,available_at:new Date(Date.now()+5*60000).toISOString()}).eq('appointment_id',job.id).eq('lease',job.lease);
  }
 }
 return {issued,failed};
}
