import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { programStripe, programStripeLive } from '@/lib/online-programs/payments';
import { checked } from '@/lib/online-programs/store';
import {reconcileIntroPayment} from '@/lib/member-funnels/payment';
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature'), secret = process.env.PROGRAM_STRIPE_WEBHOOK_SECRET;
  if (!signature) return new NextResponse('Missing signature', { status: 400 });
  if (!secret || !process.env.PROGRAM_STRIPE_SECRET_KEY) return new NextResponse('Webhook not configured', { status: 503 });
  const stripe = programStripe();
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return new NextResponse('Invalid signature', { status: 400 }); }
  if (event.livemode !== programStripeLive()) return new NextResponse('Mode mismatch', { status: 400 });
  const object = event.data.object as Stripe.Checkout.Session | Stripe.Charge;
  if (object.metadata?.type !== 'online_program') return NextResponse.json({ received: true });
  const db = getServiceSupabase();
  try {
    if(event.type==='payment_intent.amount_capturable_updated'||event.type==='payment_intent.succeeded'){
      const intent=event.data.object as Stripe.PaymentIntent;
      if(intent.capture_method==='manual')await reconcileIntroPayment(intent.id,event.type==='payment_intent.amount_capturable_updated'?event.created:undefined);
      return NextResponse.json({received:true});
    }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = await stripe.checkout.sessions.retrieve(object.id);
      if (session.payment_status !== 'paid') return NextResponse.json({ received: true });
      if (session.mode !== 'payment' || session.metadata?.type !== 'online_program' || !session.metadata.orderId || !session.metadata.userId || typeof session.payment_intent !== 'string') throw new Error('Invalid program payment');
      const intent = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] });
      if(intent.capture_method==='manual'){await reconcileIntroPayment(intent.id);return NextResponse.json({received:true});}
      if (intent.status !== 'succeeded' || intent.metadata.orderId !== session.metadata.orderId || intent.amount_received !== session.amount_total) throw new Error('Payment intent mismatch');
      const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
      if (charge?.amount_refunded) checked(await db.rpc('online_program_refund', { p_order: session.metadata.orderId, p_intent: intent.id, p_amount: charge.amount, p_refunded: charge.amount_refunded, p_currency: charge.currency, p_live: event.livemode }));
      checked(await db.rpc('online_program_payment', { p_order: session.metadata.orderId, p_user: session.metadata.userId, p_session: session.id, p_intent: intent.id, p_amount: session.amount_total, p_currency: session.currency, p_live: event.livemode }));
    } else if (event.type === 'charge.refunded') {
      const charge = await stripe.charges.retrieve(object.id);
      if (!charge.metadata.orderId || typeof charge.payment_intent !== 'string') throw new Error('Refund identity missing');
      checked(await db.rpc('online_program_refund', { p_order: charge.metadata.orderId, p_intent: charge.payment_intent, p_amount: charge.amount, p_refunded: charge.amount_refunded, p_currency: charge.currency, p_live: event.livemode }));
    }
    return NextResponse.json({ received: true });
  } catch {
    // Stripe retries; database functions are transactional and idempotent.
    return new NextResponse('Program payment verification failed', { status: 500 });
  }
}
