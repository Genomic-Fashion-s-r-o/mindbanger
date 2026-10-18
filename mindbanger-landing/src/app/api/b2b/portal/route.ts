import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { orgId } = await req.json();

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await getVerifiedSession(supabase);

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

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, slug')
      .eq('id', orgId)
      .single();

    if (!org || !org.stripe_customer_id) {
       return NextResponse.json({ error: 'Customer not found or not subscribed yet' }, { status: 404 });
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/mindbanger_daily/app/organization`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Portal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
