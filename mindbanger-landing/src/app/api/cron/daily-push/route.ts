import { DAILY_ENABLED } from '@/lib/client-platform';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { verifyVercelCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const isAuthorized = await verifyVercelCron(request);
    if (!isAuthorized) {
      return new Response('Unauthorized Cron Source', { status: 401 });
    }

    if (!DAILY_ENABLED) return NextResponse.json({ skipped: true, reason: 'Daily disabled' });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    webpush.setVapidDetails(
      'mailto:hello@mindbanger.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response('Server Error', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Today's Daily Signals
    const today = new Date().toISOString().split('T')[0];
    const { data: dailySignals } = await supabase
      .from('daily_signals')
      .select('language, push_text, theme')
      .eq('date', today);

    // Group signals by language
    const signalsByLang: Record<string, { push_text: string, title?: string }> = {};
    const fallbackText: Record<string, string> = {
      en: "Today's daily mindset reset is ready!",
      sk: "Tvoj dnešný denný reštart je pripravený!",
      cs: "Tvůj dnešní restart je připraven!"
    };

    if (dailySignals) {
      dailySignals.forEach(s => {
        signalsByLang[s.language] = {
           push_text: s.push_text || fallbackText[s.language] || fallbackText['en'],
           title: "Mindbanger - " + s.theme
        };
      });
    }

    // 2. Fetch Active users push subscriptions
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        profiles ( preferred_language, timezone, notification_time )
      `)
      .in('status', ['active', 'trialing']);

    if (!activeSubs || activeSubs.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found.' });
    }

    // Filter by current hour matching notification_time in their timezone
    const currentUTC = new Date();
    
    const usersToNotify = activeSubs.filter(sub => {
      const p = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;
      const tz = p?.timezone || 'UTC';
      const notifTime = p?.notification_time || '06:00:00'; // expected format HH:mm:ss
      
      try {
        // Získame aktuálny čas v timezone užívateľa
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: '2-digit',
            hour12: false
        });
        const userCurrentHour = parseInt(formatter.format(currentUTC), 10);
        
        // Z notifTime (napr. '06:00:00') zoberieme hodinu
        const targetHour = parseInt(notifTime.split(':')[0], 10);
        
        return userCurrentHour === targetHour;
      } catch (e) {
        // Ak parsovanie zlyhalo, posleme to bezpecne s predvolenym casom (ignorujeme pre tento beh)
        return false;
      }
    });

    if (usersToNotify.length === 0) {
      return NextResponse.json({ message: 'No users matching the current notification hour.' });
    }

    const activeUserIds = usersToNotify.map(s => s.user_id);
    
    // Ziskame jazykove nastavenia, aby sme vedeli co poslat
    const userLanguages: Record<string, string> = {};
    usersToNotify.forEach(s => {
      const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      userLanguages[s.user_id] = p?.preferred_language || 'en';
    });

    const { data: pushTokens } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', activeUserIds);

    if (!pushTokens || pushTokens.length === 0) {
       return NextResponse.json({ message: 'No push tokens found.' });
    }

    // 3. Send notifications
    let successCount = 0;
    let failCount = 0;

    for (const token of pushTokens) {
      // Find user's language
      const userLang = userLanguages[token.user_id] || 'en';
      
      const signalContext = signalsByLang[userLang] || signalsByLang['en'];

      const payload = JSON.stringify({
        title: signalContext?.title || 'Mindbanger Daily',
        body: signalContext?.push_text || fallbackText[userLang] || fallbackText['en'],
        url: 'https://mindbanger.com/mindbanger_daily/app/today'
      });

      const pushSubscription = {
        endpoint: token.endpoint,
        keys: {
          p256dh: token.p256dh,
          auth: token.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (err: any) {
        console.error('Push notification failed:', err);
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or is invalid, remove it
          await supabase.from('push_subscriptions').delete().eq('id', token.id);
        }
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: successCount,
      failCount: failCount
    });
  } catch (err: any) {
    console.error('Push Cron job error:', err.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}
