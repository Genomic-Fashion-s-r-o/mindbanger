import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { createClient } from '@/lib/supabase-server';
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, refMode, refCode } = body;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing email or user ID' }, { status: 400 });
    }

    // Force strict production URL for all Stripe redirects to avoid Vercel preview environments
    const appUrl = 'https://www.mindbanger.com';
    
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      // Hardcoded appUrl to avoid Vercel preview environments grabbing the success URL
      success_url: `${appUrl}/mindbanger_daily/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/mindbanger_daily/cancel`,
      metadata: {
        userId: userId,
        ...(refMode && { refMode }),
        ...(refCode && { refCode }),
      },
      subscription_data: {
        metadata: {
          userId: userId,
          ...(refMode && { refMode }),
          ...(refCode && { refCode }),
        }
      }
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
