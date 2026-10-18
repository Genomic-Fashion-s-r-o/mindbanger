import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-service";
import { sendEmail } from "@/lib/email";
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    // Basic IP-based rate limiting fallback
    if (rateLimit) {
      try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const { success } = await rateLimit.limit(`magic-link_${ip}`);
        if (!success) {
          return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        }
      } catch (rateLimitErr) {
        console.warn('Rate limit failed or threw an error, ignoring:', rateLimitErr);
      }
    }

    const { email, options, lang: rawLang = 'en' } = await req.json();
    const lang = typeof rawLang === 'string' ? rawLang.toLowerCase() : 'en';
    const normalizedLang = lang === 'cz' ? 'cs' : lang;
    const selectedLang = normalizedLang === 'sk' || normalizedLang === 'cs' || normalizedLang === 'en'
      ? normalizedLang
      : 'en';
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
      
      if (!profile?.id) {
        const { data: newUser } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: options?.data
        });

        // Insert referral record for the newly registered user
        const refCode = options?.data?.mb_refCode || options?.data?.refCode;
        const refMode = options?.data?.mb_refMode || options?.data?.refMode;

          if (newUser?.user?.id && refCode) {
          try {
            await supabase.from('referrals').insert({
              affiliate_id: refCode,
              referee_user_id: newUser.user.id,
              commission_model: refMode === 'B' ? 'lifetime_20' : 'second_month',
              status: 'pending', // Musime pouzit povoleny status kvoli DB constraintom
              amount: 0
            });
            console.log('[Magic Link] Referral inserted for new user', newUser.user.id);
          } catch (refErr) {
            console.error('[Magic Link] Referral insert error:', refErr);
          }
        }
      } else if (options?.data) {
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);
        if (user) {
           await supabase.auth.admin.updateUserById(profile.id, {
               user_metadata: { ...user.user_metadata, ...options.data }
           });
        }
      }
    } catch (createError: any) {
      console.error('[Magic Link] Error creating or updating user via admin API:', createError);
      // Let it fall through, the generateLink below might still work if user exists,
      // but we log heavily for incident response visibility.
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });

    if (linkError) {
      console.error("Supabase Link Error:", linkError);
      throw new Error(linkError.message);
    }

    const otpCode = linkData.properties?.email_otp;
    if (!otpCode) {
      throw new Error("Nepodarilo sa vygenerovat OTP kod zo Supabase.");
    }

    const t: Record<string, any> = {
      sk: {
        subject: "Vstupný kód - Mindbanger Vault",
        title: "Tvoj overovací kód",
        subtitle: "Skopíruj si alebo si zapamätaj tento 6-miestny kód:",
        button: "Prejsť na zadanie kódu",
        description: "Ak si sa sem dostal z inej aplikácie, stlač tlačidlo vyššie, ktoré ťa bezpečne prepne späť do prehliadača priamo na zadanie kódu.",
        footer: "Tento email bol vygenerovaný automaticky. Ak si o tento kód nežiadal, môžeš túto správu ignorovať."
      },
      cs: {
        subject: 'Vstupní kód - Mindbanger Vault',
        title: 'Tvůj ověřovací kód',
        subtitle: 'Zkopíruj si nebo zapamatuj tento 6místný kód:',
        button: 'Přejít na zadání kódu',
        description: 'Pokud ses sem dostal z jiné aplikace, klikni na tlačítko výše, které tě bezpečně přepne zpět do prohlížeče přímo na zadání kódu.',
        footer: 'Tento email byl vygenerován automaticky. Pokud jsi o tento kód nežádal, můžeš tuto zprávu ignorovat.'
      }
    };

    const htmlContent = selectedLang === 'sk' ? `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0f172a; margin-bottom: 24px;">${t.sk.title}</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              ${t.sk.subtitle} <strong>${otpCode}</strong>
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindbanger.com'}/mindbanger_daily/auth/verify" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  ${t.sk.button}
              </a>
          </div>
          <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              ${t.sk.description}
          </p>
          </div>` : selectedLang === 'cs' ? `
          <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0f172a; margin-bottom: 24px;">${t.cs.title}</h1>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              ${t.cs.subtitle} <strong>${otpCode}</strong>
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindbanger.com'}/mindbanger_daily/auth/verify" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ${t.cs.button}
              </a>
            </div>
            <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              ${t.cs.description}
            </p>
      </div>` : `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0f172a; margin-bottom: 24px;">Entry Code - Mindbanger Vault</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              Your verification code is: <strong>${otpCode}</strong>
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindbanger.com'}/mindbanger_daily/auth/verify" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Go to verification
              </a>
          </div>
      </div>`;

    const { success, error: emailError } = await sendEmail({
      to: email,
      subject: selectedLang === 'sk' ? t.sk.subject : selectedLang === 'cs' ? t.cs.subject : 'Entry code - Mindbanger Vault',
      html: htmlContent
    });

    if (!success) {
      console.error("Email sending failed:", emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Link sent' });
  } catch (error: any) {
    console.error('[Magic Link Route Error]:', error);
    return NextResponse.json({ error: 'Failed to send magic link', details: error?.message || String(error) }, { status: 500 });
  }
}
