import 'server-only';
import { coachingStripe, coachingStripeLive } from './stripe-client';
import { siteOrigin, getBookingSettings } from './store';

export async function stripeReadiness(mode?:'confirm_then_pay'|'authorize_confirm') {
  const stripe = coachingStripe();
  const [account, endpoints] = await Promise.all([stripe.accounts.retrieve(), stripe.webhookEndpoints.list({ limit: 100 })]);
  const expected = siteOrigin() + '/api/webhooks/coaching-stripe';
  const webhook = endpoints.data.find(e => e.url === expected && e.status === 'enabled');
  const manual=(mode||(await getBookingSettings()).settings.paymentMode)==='authorize_confirm';
  const events = ['checkout.session.completed', 'charge.refunded',...(manual?['payment_intent.amount_capturable_updated','payment_intent.succeeded','payment_intent.canceled']:[])];
  let authorizationReadAccess=!manual;
  if(manual){try{await Promise.all([stripe.paymentIntents.list({limit:1}),stripe.charges.list({limit:1})]);authorizationReadAccess=true;}catch{authorizationReadAccess=false;}}
  const company = account.company?.name || account.business_profile?.name || '';
  const status = { live: coachingStripeLive(), company, companyMatches: company.toLowerCase().includes('milkam'), chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled, webhookConfigured: !!webhook, webhookEventsReady: !!webhook && events.every(event => webhook.enabled_events.includes('*') || webhook.enabled_events.includes(event)), signingSecretConfigured: !!process.env.COACHING_STRIPE_WEBHOOK_SECRET, requirementsDue: account.requirements?.currently_due?.length || 0 };
  return { ...status, manualCapture:manual,authorizationReadAccess,ready: status.live && status.companyMatches && status.chargesEnabled && status.payoutsEnabled && status.webhookEventsReady && status.signingSecretConfigured && status.requirementsDue === 0&&authorizationReadAccess };
}
