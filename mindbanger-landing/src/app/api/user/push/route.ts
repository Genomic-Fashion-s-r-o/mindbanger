import { DAILY_ENABLED } from '@/lib/client-platform';
import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  if (!DAILY_ENABLED) return NextResponse.json({ error: 'Program Mindbanger Daily je momentálne vypnutý.' }, { status: 410 });
  try {
    const supabase = await createClient();
    const { data: { session } } = await getVerifiedSession(supabase);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription data: Missing endpoint or keys' }, { status: 400 });
    }

    // Save to the database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: session.user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: 'endpoint' } // Prevent duplicates for the same browser
      );

    if (error) {
      console.error('Error saving push subscription:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
