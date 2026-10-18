import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import stripe from '@/lib/stripe';

const BASE_PRICE = 7.99;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orgId, emails, quantity } = body;

    // Strict validation
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const maxLimit = 1000;
    const finalQuantity = quantity || (Array.isArray(emails) ? emails.length : 0);

    if (finalQuantity <= 0 || finalQuantity > maxLimit) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    if (Array.isArray(emails) && finalQuantity !== emails.length) {
      return NextResponse.json({ error: 'Quantity mismatch with provided emails count' }, { status: 400 });
    }

    // Server-side price calculation logic
    let unitPrice = BASE_PRICE;
    if (finalQuantity >= 25) {
      unitPrice = BASE_PRICE * 0.75;
    } else if (finalQuantity >= 5) {
      unitPrice = BASE_PRICE * 0.85;
    }

    const unitAmountCents = Math.round(unitPrice * 100);

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is owner/admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', session.user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Organization Details for Stripe
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (!org) {
       return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    }

    // Save pending invites
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ pending_invites: Array.isArray(emails) ? emails.filter(e => e !== 'placeholder' && e.includes('@')) : [] })
      .eq('id', orgId);

    if (updateError) throw updateError;

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Mental coaching Mindbanger',
              description: `Firemný balík pre ${org.name} (${finalQuantity} aktívnych licencií)`,
            },
            unit_amount: unitAmountCents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: finalQuantity, // 1 line item, but price_data itself could be per-unit and quantity=emails.length
        },
      ],
      mode: 'subscription',
      customer_email: org.billing_email || session.user.email,
      billing_address_collection: 'required',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/mindbanger_daily/app/organization?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/mindbanger_daily/app/organization?payment=cancelled`,
      metadata: {
        type: 'b2b_upgrade', // Important metadata
        org_id: org.id,
        seats: finalQuantity.toString(),
      },
      automatic_tax: { enabled: true },
      // Allow customer to input TAX ID on Stripe checkout automatically:
      tax_id_collection: { enabled: true }, 
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Buy Seats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
