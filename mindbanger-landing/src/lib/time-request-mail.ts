import 'server-only';
import {getServiceSupabase} from './supabase-service';
import {getBookingSettings} from './booking/store';
import {timeRequestEmail} from './time-request-email-content';

type Job={id:string;lease:string;audience:'client'|'owner';email:string|null;locale:'sk'|'cs'|'en'};
type State='queued'|'sent'|'failed'|'review';
export async function processTimeRequestMail(requestKey?:string) {
  if(!process.env.BREVO_API_KEY)return {processed:0};
  const {settings,installed}=await getBookingSettings();
  if(!installed||!settings.email)throw Error('time_request_mail_configuration');
  const db=getServiceSupabase();
  const {data,error}=await db.rpc('appointment_time_request_mail_claim',{p_key:requestKey||null,p_limit:requestKey?2:10});
  if(error)throw Error('time_request_mail_queue');
  const results=await Promise.allSettled(((data||[]) as Job[]).map(async job=>{
    let state:State='review',provider:string|null=null,code:string|null=null,attempted=false;
    try {
      const content=timeRequestEmail(job.audience,job.locale);
      const recipient=job.audience==='owner'?settings.email:job.email;
      if(!recipient)throw Error('recipient_missing');
      attempted=true;
      const response=await fetch('https://api.brevo.com/v3/smtp/email',{
        method:'POST',headers:{'api-key':process.env.BREVO_API_KEY!,'Content-Type':'application/json',idempotencyKey:job.id},
        body:JSON.stringify({sender:{name:'Mgr. Miroslav Jobus | Mindbanger',email:process.env.BOOKING_FROM_EMAIL||'miroslav@mindbanger.com'},
          to:[{email:recipient}],replyTo:{email:settings.email},subject:content.subject,htmlContent:content.html,textContent:content.text,
          headers:{idempotencyKey:job.id},tags:['appointment-time-request',job.audience]}),signal:AbortSignal.timeout(12000),
      });
      if(response.ok){
        const result=await response.json();
        if(typeof result.messageId!=='string'||!result.messageId)throw Error('provider_result_uncertain');
        provider=result.messageId;state='sent';
      }else{code='brevo_http_'+response.status;state=response.status===429?'queued':response.status>=400&&response.status<500?'failed':'review';}
    }catch{state=attempted?'review':'queued';code=attempted?'delivery_uncertain_check_brevo':'recipient_missing';}
    const finish=await db.rpc('appointment_time_request_mail_finish',{p_id:job.id,p_lease:job.lease,p_state:state,p_provider:provider,p_error:code});
    if(finish.error)throw Error('time_request_mail_result');
    if(state==='review'||state==='failed')console.warn('time_request_mail_delivery',{state,code});
    return state;
  }));
  if(results.some(r=>r.status==='rejected'))throw Error('time_request_mail_result');
  return {processed:results.length};
}
