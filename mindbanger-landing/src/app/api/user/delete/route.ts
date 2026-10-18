import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await getVerifiedSession(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Zisti či má Stripe Customer ID a zruš subscriptions
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profile?.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
      });

      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
      
      // Voliteľné: Zmazať zákazníka priamo aj zo Stripe
      try {
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (e) {
        console.warn('Could not delete Stripe customer, but subscriptions were cancelled', e);
      }
    }

    // 2. Admin account deletion
    const adminSupabase = await createAdminClient();
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete account failed');
    return NextResponse.json({ error: 'Nastala chyba pri odstraňovaní účtu' }, { status: 500 });
  }
}
