import 'server-only';
import {getServiceSupabase} from '@/lib/supabase-service';
import {renderProgramEmail,type ProgramEmail} from './program-email-content';
type Job=ProgramEmail&{id:string;lease:string;kind:'manual'|'automatic';interestId:string;email:string;token:string;launchDate:string|null};
export async function sendCampaignEmail(email:string,message:ProgramEmail,date:string|null,unsubscribe:string,key:string){const rendered=renderProgramEmail(message,date,unsubscribe);const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':process.env.BREVO_API_KEY!,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Miroslav Jobus | Mindbanger',email:process.env.BOOKING_FROM_EMAIL||'miroslav@mindbanger.com'},to:[{email}],replyTo:{email:'miroslav@mindbanger.com'},headers:{'idempotencyKey':key},subject:rendered.subject,htmlContent:rendered.html,textContent:rendered.text}),signal:AbortSignal.timeout(12000)});if(!response.ok){const e=new Error('brevo_http_'+response.status);throw e;}const result=await response.json();return String(result.messageId||'');}
async function deliver(db:ReturnType<typeof getServiceSupabase>,job:Job){
 let state='review',provider:string|null=null,code:string|null=null;
 try{
  if(job.kind==='automatic'){
   const cfg=await db.from('program_campaign_settings').select('enabled').eq('id','sugar-november-2026').single();if(cfg.error)throw Error('campaign_check_unavailable');
   if(!cfg.data?.enabled){const release=await db.rpc('program_delivery_release',{p_id:job.id,p_lease:job.lease});if(release.error)throw Error('delivery_release_failed');return 'paused';}
  }
  const recipient=await db.from('program_interest').select('state,consent_version').eq('id',job.interestId).single();
  if(recipient.error&&recipient.error.code!=='PGRST116')throw Error('recipient_check_unavailable');
  if(recipient.data?.state!=='confirmed'||recipient.data?.consent_version!=='sugar-interest-genomic-2026-10-21'){state='skipped';code='recipient_removed';}
  else{const url='https://www.mindbanger.com/produkty/chut-na-sladke/potvrdenie?odhlasit='+job.token;provider=await sendCampaignEmail(job.email,job,job.launchDate,url,'program-'+job.id);state='sent';}
 }catch(e){code=e instanceof Error?e.message:'delivery_uncertain';state=/^brevo_http_4\d\d$/.test(code)?'failed':'review';}
 const finish=await db.rpc('program_delivery_finish',{p_id:job.id,p_lease:job.lease,p_state:state,p_provider:provider,p_error:code});if(finish.error)throw Error('Delivery result unavailable');return state;
}
export async function processProgramCampaigns(){
 if(!process.env.BREVO_API_KEY)throw Error('Email is not configured');
 const db=getServiceSupabase(),started=Date.now(),totals={sent:0,review:0,failed:0};let processed=0;
 const prepared=await db.rpc('program_campaign_prepare');if(prepared.error)throw Error('Campaign scheduler unavailable');
 while(processed<200&&Date.now()-started<100000){
  const {data,error}=await db.rpc('program_delivery_claim',{p_limit:5});if(error)throw Error('Campaign queue unavailable');const jobs=(data||[]) as Job[];if(!jobs.length)break;
  const results=await Promise.allSettled(jobs.map(job=>deliver(db,job)));processed+=jobs.length;let paused=false,broken=false;
  for(const result of results){if(result.status==='rejected'){broken=true;continue;}const state=result.value;if(state==='paused')paused=true;else if(state==='sent'||state==='review'||state==='failed')totals[state]++;}
  if(broken)throw Error('Delivery result unavailable');if(paused)break;
 }
 return totals;
}
