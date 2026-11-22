import { after, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { coachingStripe, coachingStripeLive } from '@/lib/booking/stripe-client';
import { coachingCheckoutPayment } from '@/lib/booking/stripe-payment';
import { getServiceSupabase } from '@/lib/supabase-service';
import { processBookingMail } from '@/lib/booking/notifications';
import { recordIntent } from '@/lib/booking/authorization';
import { reconcileAuthorizations } from '@/lib/booking/authorization';
import { processVideoJobs } from '@/lib/booking/video-jobs';
import { processDocumentJobs } from '@/lib/booking/documents';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new NextResponse('Missing signature', { status: 400 });
  const secret = process.env.COACHING_STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.COACHING_STRIPE_SECRET_KEY) return new NextResponse('Webhook is not configured', { status: 503 });
  let event: Stripe.Event;
  try { event = coachingStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return new NextResponse('Invalid signature', { status: 400 }); }
  if (event.livemode !== coachingStripeLive()) return new NextResponse('Mode mismatch', { status: 400 });
  const object = event.data.object as Stripe.Checkout.Session;
  // The Milkam account also serves Sportbooster; ignore its unrelated purchases.
  if (object.metadata?.type !== 'coaching_appointment') return NextResponse.json({ received: true });
  const db = getServiceSupabase();
  try {
    if(object.metadata.paymentFlow==='authorize_confirm'&&event.type.startsWith('payment_intent.')){
      const latest=await coachingStripe().paymentIntents.retrieve(object.id,{expand:['latest_charge']});
      await recordIntent(latest);
      after(async()=>{try{await reconcileAuthorizations();await processDocumentJobs();await processVideoJobs();await processBookingMail();}catch{/* Durable cron retry. */}});
      return NextResponse.json({received:true});
    }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      if(object.metadata.paymentFlow==='authorize_confirm'){
        if(typeof object.payment_intent!=='string')throw Error('Missing intent');
        const intent=await coachingStripe().paymentIntents.retrieve(object.payment_intent,{expand:['latest_charge']});await recordIntent(intent);
        after(async()=>{try{await reconcileAuthorizations();await processDocumentJobs();await processVideoJobs();await processBookingMail();}catch{/* Durable retry. */}});
        return NextResponse.json({received:true});
      }
      if (object.payment_status !== 'paid') return NextResponse.json({ received: true });
      const { error } = await db.rpc('appointment_record_payment', coachingCheckoutPayment(object));
      if (error) throw error;
      after(async () => { try { await processDocumentJobs();await processBookingMail(); } catch { /* Durable retry. */ } });
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent !== 'string') throw new Error('Missing intent');
      const { data, error } = await db.from('appointments').select('id').eq('payment_intent_id', charge.payment_intent).single();
      if (error || !data || data.id !== charge.metadata.appointmentId) throw new Error('Refund mismatch');
      const result = await db.rpc('appointment_record_refund', { p_id: data.id, p_intent: charge.payment_intent, p_amount: charge.amount, p_refunded_amount: charge.amount_refunded, p_currency: charge.currency });
      if (result.error) throw result.error;
      after(async()=>{try{await processDocumentJobs();await processVideoJobs();await processBookingMail();}catch{/* Durable retry. */}});
    }
    return NextResponse.json({ received: true });
  } catch { return new NextResponse('Payment verification failed', { status: 500 }); }
}
