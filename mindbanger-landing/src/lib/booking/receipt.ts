import type Stripe from 'stripe';
import { validCents } from './amount';

// A card authorization is not a paid service. Never offer its receipt as proof of payment.
export function coachingReceipt(intent: Stripe.PaymentIntent, charge: Stripe.Charge, appointmentId: string,expectedAmount=4900,expectedCurrency='eur') {
  if (!validCents(expectedAmount)||intent.status !== 'succeeded' || intent.metadata.type !== 'coaching_appointment' || intent.metadata.appointmentId !== appointmentId || intent.currency !== expectedCurrency || intent.amount !== expectedAmount) return null;
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (intentId !== intent.id || !charge.captured || !charge.paid || charge.amount_captured !== expectedAmount || charge.currency !== expectedCurrency || !charge.receipt_url) return null;
  try {
    const url = new URL(charge.receipt_url);
    if (url.protocol !== 'https:' || !['pay.stripe.com', 'receipts.stripe.com'].includes(url.hostname) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
