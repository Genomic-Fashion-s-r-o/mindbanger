import { DAILY_ENABLED } from '@/lib/client-platform';
import { getVerifiedSession } from '@/lib/supabase-server';
﻿import { NextResponse } from 'next/server';
import {z} from 'zod';
import stripe from '@/lib/stripe';
import { createClient } from '@/lib/supabase-server';
import {getServiceSupabase} from '@/lib/supabase-service';
import {sameOrigin} from '@/lib/booking/store';
const schema=z.object({email:z.email().trim().toLowerCase().max(254),refMode:z.string().max(100).nullable().optional(),refCode:z.string().max(200).nullable().optional(),termsAccepted:z.literal(true),performanceRequested:z.literal(true),adultConfirmed:z.literal(true),termsVersion:z.literal('daily-2026-10-21-v2'),locale:z.enum(['sk','cs','en'])}).strict();
export async function POST(req: Request) {
  if (!DAILY_ENABLED) return NextResponse.json({ error: 'Program Mindbanger Daily je momentálne vypnutý.' }, { status: 410 });
  try {
    if(!sameOrigin(req))return NextResponse.json({error:'Invalid request origin'},{status:403});
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:'Confirm the current terms, age and immediate performance request.'},{status:400});
    const { email, refMode, refCode,termsVersion,locale } = parsed.data;
    const supabase = await createClient();
    const { data: { session } } = await getVerifiedSession(supabase);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    if (!email || !userId || session.user.email?.toLowerCase()!==email) {
      return NextResponse.json({ error: 'Missing email or user ID' }, { status: 400 });
    }

    const service=getServiceSupabase();
    const {data:consent,error:consentError}=await service.from('digital_order_consents').insert({user_id:userId,email,product:'Mindbanger Daily',terms_version:termsVersion,terms_accepted:true,performance_requested:true,adult_confirmed:true,locale}).select('id').single();
    if(consentError||!consent)return NextResponse.json({error:'Could not record the required order confirmations.'},{status:503});

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
        legalConsentId: consent.id,
        termsVersion,
        ...(refMode && { refMode }),
        ...(refCode && { refCode }),
      },
      subscription_data: {
        metadata: {
          userId: userId,
          legalConsentId: consent.id,
          termsVersion,
          ...(refMode && { refMode }),
          ...(refCode && { refCode }),
        }
      }
    });

    await service.from('digital_order_consents').update({stripe_session_id:checkoutSession.id}).eq('id',consent.id);

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
