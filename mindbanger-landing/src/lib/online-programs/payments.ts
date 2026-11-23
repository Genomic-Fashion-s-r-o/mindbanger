import 'server-only';
import Stripe from 'stripe';
import { ProgramError } from './store';
export function programStripe() {
  const key = process.env.PROGRAM_STRIPE_SECRET_KEY;
  if (!key) throw new ProgramError('Predaj online programov zatiaľ nie je spustený.', 503);
  return new Stripe(key, { appInfo: { name: 'Mindbanger Online Programs', version: '1.0.0' } });
}
export function programStripeLive() { return /^(sk|rk)_live_/.test(process.env.PROGRAM_STRIPE_SECRET_KEY || ''); }
