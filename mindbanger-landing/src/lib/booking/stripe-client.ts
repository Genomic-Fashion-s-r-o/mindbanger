import 'server-only';
import Stripe from 'stripe';

// Coaching belongs to Milkam; Daily keeps its existing Stripe credentials.
export function coachingStripe() {
  const key = process.env.COACHING_STRIPE_SECRET_KEY;
  if (!key) throw new Error('Coaching Stripe is not configured');
  return new Stripe(key, { appInfo: { name: 'Mindbanger Coaching', version: '1.0.0' } });
}
export function coachingStripeLive() {
  return /^(sk|rk)_live_/.test(process.env.COACHING_STRIPE_SECRET_KEY || '');
}
