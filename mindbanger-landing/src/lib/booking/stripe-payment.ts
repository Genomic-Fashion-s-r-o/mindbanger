import type Stripe from 'stripe';
import { validCents } from './amount';
export function coachingCheckoutPayment(session: Stripe.Checkout.Session) {
  const id=session.metadata?.appointmentId;
  if(session.metadata?.type!=='coaching_appointment'||!id||session.client_reference_id!==id||session.mode!=='payment'||session.payment_status!=='paid'||!session.currency||!['eur','czk'].includes(session.currency)||!validCents(session.amount_total)||typeof session.payment_intent!=='string')throw new Error('Invalid coaching payment');
  return {p_id:id,p_session:session.id,p_intent:session.payment_intent,p_amount:session.amount_total,p_currency:session.currency,p_refunded:false};
}
