import 'server-only';
import { getServiceSupabase } from '@/lib/supabase-service';
import { programStripe,programStripeLive } from '@/lib/online-programs/payments';
import { checked } from '@/lib/online-programs/store';
// Only a signed Stripe authorization event supplies the completion timestamp.
// Checkout itself has a minimum 30-minute lifetime; capture enforces our shorter deadline.
export async function reconcileIntroPayment(intentId:string,authorizedAt?:number){
 const stripe=programStripe(),db=getServiceSupabase();
 let intent=await stripe.paymentIntents.retrieve(intentId,{expand:['latest_charge']});
 if(intent.metadata.type!=='online_program'||intent.capture_method!=='manual'||!intent.metadata.orderId)throw new Error('Invalid intro payment');
 const order=checked(await db.from('online_program_orders').select('id,user_id,stripe_session_id,amount_cents,currency,livemode,offer_deadline,authorized_at,status').eq('id',intent.metadata.orderId).single());
 if(!order||!order.offer_deadline||!order.stripe_session_id||order.user_id!==intent.metadata.userId||order.amount_cents!==intent.amount||order.currency!==intent.currency||order.livemode!==programStripeLive())throw new Error('Intro payment mismatch');
 if(intent.status==='canceled')return;
 if(!order.authorized_at&&authorizedAt===undefined)return;
 const allowed=checked(await db.rpc('member_funnel_authorize',{p_order:order.id,p_intent:intent.id,p_completed_at:order.authorized_at||new Date(authorizedAt!*1000).toISOString(),p_amount:intent.amount,p_currency:intent.currency,p_live:intent.livemode}));
 if(!allowed){if(intent.status==='requires_capture')await stripe.paymentIntents.cancel(intent.id,{}, {idempotencyKey:'expired-program-offer-'+order.id});return;}
 if(intent.status==='requires_capture'){
  if(intent.amount_capturable!==order.amount_cents)throw new Error('Intro capturable amount mismatch');
  intent=await stripe.paymentIntents.capture(intent.id,{amount_to_capture:order.amount_cents},{idempotencyKey:'capture-program-offer-'+order.id});
 }
 if(intent.status!=='succeeded')throw new Error('Intro capture pending');
 if(intent.amount_received!==order.amount_cents)throw new Error('Intro capture amount mismatch');
 const current=await stripe.paymentIntents.retrieve(intent.id,{expand:['latest_charge']});
 const charge=typeof current.latest_charge==='object'?current.latest_charge:null;
 if(charge?.amount_refunded)checked(await db.rpc('online_program_refund',{p_order:order.id,p_intent:intent.id,p_amount:charge.amount,p_refunded:charge.amount_refunded,p_currency:charge.currency,p_live:intent.livemode}));
 checked(await db.rpc('online_program_payment',{p_order:order.id,p_user:order.user_id,p_session:order.stripe_session_id,p_intent:intent.id,p_amount:order.amount_cents,p_currency:order.currency,p_live:intent.livemode}));
}
