import { DAILY_ENABLED } from '@/lib/client-platform';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dailyEmailTemplates, generateEmailHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';
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

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response('Server Error', { status: 500 });
    }

    if (!process.env.BREVO_API_KEY) {
      console.error('Missing BREVO_API_KEY');
      return new Response('Server Error', { status: 500 });
    }

    // Bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active/trialing subscriptions & their user profiles to get language
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        customer_email,
        user_id,
        profiles (
          preferred_language
        )
      `)
      .in('status', ['active', 'trialing']);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return new Response('Error fetching subscriptions from database', { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found.' });
    }

    // Fetch today's signals to get themes
    const today = new Date().toISOString().split('T')[0];
    const { data: dailySignals } = await supabase
      .from('daily_signals')
      .select('language, theme')
      .eq('date', today);

    const themesByLang: Record<string, string> = {};
    if (dailySignals) {
      dailySignals.forEach(s => {
        themesByLang[s.language] = s.theme;
      });
    }

    // Group emails by language
    const langGroups: Record<string, string[]> = { en: [], sk: [], cs: [] };
    
    // De-duplicate emails based on best profile language found
    const processedEmails = new Set<string>();

    for (const sub of subscriptions) {
      if (!sub.customer_email) continue;
      
      const emailLower = sub.customer_email.toLowerCase();
      if (processedEmails.has(emailLower)) continue;
      
      const lang = (sub.profiles as any)?.preferred_language || 'en';
      const safeLang = langGroups[lang] ? lang : 'en'; // default to en if missing

      langGroups[safeLang].push(emailLower);
      processedEmails.add(emailLower);
    }

    let sentBatches = 0;
    let totalSent = 0;
    const BATCH_SIZE = 99; // Split recipients to avoid API limits and spam filters (Brevo limit ~2000, safe limit ~100)

    // Helper to chunk array
    const chunkArray = (arr: string[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    // Send emails grouped by language via Brevo
    for (const [lang, allEmails] of Object.entries(langGroups)) {
      if (allEmails.length === 0) continue;

      const template = dailyEmailTemplates[lang as keyof typeof dailyEmailTemplates];
      
      let dynamicBody = template.body;
      const theme = themesByLang[lang];
      if (theme) {
        if (lang === 'sk') dynamicBody += `<br><br><strong>Téma dňa:</strong> ${theme}`;
        else if (lang === 'cs') dynamicBody += `<br><br><strong>Téma dne:</strong> ${theme}`;
        else dynamicBody += `<br><br><strong>Today's Focus:</strong> ${theme}`;
      }

      const htmlContent = generateEmailHtml(
        template.headline,
        dynamicBody,
        template.cta,
        template.url
      );

      // Process in batches
      const batches = chunkArray(allEmails, BATCH_SIZE);

      for (const batch of batches) {
        const { success, error } = await sendEmail({
          to: "hello@mindbanger.com",
          bcc: batch,
          subject: template.subject,
          html: htmlContent
        });

        if (success) {
            sentBatches++;
            totalSent += batch.length;
        } else {
            console.error(`Resend API error for lang ${lang} batch:`, error);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedSubscribers: processedEmails.size,
      emailsSent: totalSent,
      batches: sentBatches
    });
  } catch (err: any) {
    console.error('Cron job error:', err.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}
