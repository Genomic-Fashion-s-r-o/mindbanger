import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing. Please set the environment variable.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // @ts-expect-error - using a later api version
  apiVersion: '2023-10-16', // Fixed consistent version as previously planned
  appInfo: {
    name: 'Mindbanger',
    version: '0.1.0',
  },
});

export default stripe;
