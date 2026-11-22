import 'server-only';
import type Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabase-service';
import { coachingStripe } from './stripe-client';
import { validCents } from './amount';

export function authorizedIntent(intent:Stripe.PaymentIntent){
 if(intent.metadata.type!=='coaching_appointment'||intent.metadata.paymentFlow!=='authorize_confirm'||!intent.metadata.appointmentId||!['eur','czk'].includes(intent.currency)||!validCents(intent.amount)||intent.capture_method!=='manual')throw Error('authorization_mismatch');
 return intent.metadata.appointmentId;
}
export async function recordIntent(intent:Stripe.PaymentIntent){
 const id=authorizedIntent(intent),db=getServiceSupabase();
 if(intent.status==='requires_capture'){
  let charge=intent.latest_charge;
  if(typeof charge==='string')charge=await coachingStripe().charges.retrieve(charge);
  const expires=charge&&typeof charge==='object'?charge.payment_method_details?.card?.capture_before:null;
  if(!expires||intent.amount_capturable!==intent.amount)throw Error('authorization_expiry_missing');
  const result=await db.rpc('appointment_record_authorization',{p_id:id,p_intent:intent.id,p_amount:intent.amount_capturable,p_currency:intent.currency,p_expires:new Date(expires*1000).toISOString()});
  if(result.error)throw Error('authorization_record_failed');
 }else if(intent.status==='succeeded'){
  const result=await db.rpc('appointment_record_capture',{p_id:id,p_intent:intent.id,p_amount:intent.amount_received,p_currency:intent.currency});
  if(result.error)throw Error('capture_record_failed');
 }else if(intent.status==='canceled'){
  const result=await db.rpc('appointment_release_authorization',{p_id:id,p_intent:intent.id});
  if(result.error)throw Error('release_record_failed');
 }
}
export async function captureAppointment(id:string,actor:string){
 const db=getServiceSupabase();
 const {data,error}=await db.rpc('appointment_claim_capture',{p_id:id,p_actor:actor});
 if(error||!data?.intent)throw Error('capture_unavailable');
 if(data.paid)return;
 if(!validCents(data.amount))throw Error('capture_amount_missing');
 const before=await coachingStripe().paymentIntents.retrieve(data.intent);
 if(authorizedIntent(before)!==id||before.amount!==data.amount)throw Error('capture_mismatch');
 try{
  const intent=await coachingStripe().paymentIntents.capture(data.intent,{amount_to_capture:data.amount},{idempotencyKey:`coaching-capture-${id}-${data.intent}`});
  await recordIntent(intent);
  if(intent.status!=='succeeded')throw Error('capture_processing');
 }catch{
  // A lost response must not lead to a second charge or an unpaid confirmation.
  const intent=await coachingStripe().paymentIntents.retrieve(data.intent,{expand:['latest_charge']});
  await recordIntent(intent);
  if(intent.status!=='succeeded')throw Error('capture_processing');
 }
}
export async function reconcileAuthorizations(){
 const db=getServiceSupabase();
 const {data,error}=await db.from('appointments').select('id,status,payment_state,payment_intent_id,stripe_session_id,authorization_expires_at,hold_until,starts_at,capture_requested_at').eq('payment_flow','authorize_confirm').eq('paid',false).in('payment_state',['awaiting_checkout','authorized','capturing','cancelling']).or(`payment_state.in.(capturing,cancelling),authorization_expires_at.lte.${new Date().toISOString()},hold_until.lte.${new Date().toISOString()}`).order('updated_at').limit(30);
 if(error)throw Error('authorization_queue_unavailable');
 let processed=0,failed=0;
 for(const b of data||[]){
  try{
   const expired=b.authorization_expires_at&&Date.parse(b.authorization_expires_at)<=Date.now();
   const checkoutExpired=b.hold_until&&Date.parse(b.hold_until)<=Date.now();
   if(b.payment_state!=='capturing'&&b.payment_state!=='cancelling'&&!expired&&!checkoutExpired)continue;
   if(b.payment_state==='capturing'&&!expired&&b.capture_requested_at&&Date.parse(b.capture_requested_at)>Date.now()-5*60000)continue;
   let intentId=b.payment_intent_id;
   if(!intentId&&b.stripe_session_id){
    let session=await coachingStripe().checkout.sessions.retrieve(b.stripe_session_id);
    if(session.status==='open'&&(checkoutExpired||b.payment_state==='cancelling')){
     try{session=await coachingStripe().checkout.sessions.expire(session.id);}catch{session=await coachingStripe().checkout.sessions.retrieve(session.id);}
    }
    intentId=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null;
    if(session.status==='open'||(session.status==='complete'&&!intentId))continue;
   }
   if(intentId){
    let intent=await coachingStripe().paymentIntents.retrieve(intentId,{expand:['latest_charge']});
    if(b.payment_state==='cancelling'||expired||checkoutExpired){
     if(intent.status!=='canceled'&&intent.status!=='succeeded')intent=await coachingStripe().paymentIntents.cancel(intentId,{}, {idempotencyKey:`coaching-release-${b.id}-${intentId}`});
    }
    await recordIntent(intent);
    if(b.payment_state==='capturing'&&intent.status==='requires_capture'){
     await db.rpc('appointment_capture_retryable',{p_id:b.id,p_intent:intent.id});
    }
   }else if(b.payment_state==='cancelling'||checkoutExpired){
    const r=await db.rpc('appointment_release_authorization',{p_id:b.id,p_intent:null});if(r.error)throw Error('release_failed');
   }
   processed++;
  }catch{failed++;}
 }
 return {processed,failed};
}
